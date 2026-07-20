'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import type { MappingDetailResponse } from '@/http-heimdall/models'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownToLine,
  MoreHorizontal,
  Network,
  PenLine,
  Pencil,
  Plus,
  SearchCheck,
  Trash2,
  X,
} from 'lucide-react'
import * as React from 'react'
import { SummaryCards } from '../../components/summary-cards'
import { useAllHeimdallActions } from '../../hooks/use-heimdall-actions'
import {
  useDeleteMapping,
  useHeimdallMappings,
} from '../../hooks/use-heimdall-mappings'
import { METHOD_BADGE_CLASS } from '../../lib/tones'
import { MappingFormDialog } from './mapping-form-dialog'
import { ResolveMappingDialog } from './resolve-mapping-dialog'

export function MappingsDataTable() {
  const [actionFilter, setActionFilter] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [resolveOpen, setResolveOpen] = React.useState(false)
  const [mappingToEdit, setMappingToEdit] =
    React.useState<MappingDetailResponse | null>(null)
  const [mappingToDelete, setMappingToDelete] =
    React.useState<MappingDetailResponse | null>(null)

  const {
    data: mappings,
    isLoading,
    error,
    refetch,
  } = useHeimdallMappings(actionFilter || undefined)
  // Lista completa (sem filtro) para os cards de resumo; deduplicada pelo
  // React Query quando nenhum filtro está ativo.
  const { data: allMappings, isLoading: loadingAllMappings } =
    useHeimdallMappings(undefined)
  const { data: allActions } = useAllHeimdallActions()
  const deleteMapping = useDeleteMapping()

  const totalMappings = allMappings?.length ?? 0
  const getMappings =
    allMappings?.filter(mapping => mapping.method === 'GET').length ?? 0
  const writeMappings =
    allMappings?.filter(mapping =>
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(mapping.method)
    ).length ?? 0

  const openCreate = () => {
    setMappingToEdit(null)
    setFormOpen(true)
  }

  const openEdit = React.useCallback((mapping: MappingDetailResponse) => {
    setMappingToEdit(mapping)
    setFormOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<MappingDetailResponse>[]>(
    () => [
      {
        accessorKey: 'method',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Método" />
        ),
        cell: ({ row }) => {
          const method = row.original.method
          return (
            <Badge
              variant={method === 'DELETE' ? 'destructive' : 'outline'}
              className={METHOD_BADGE_CLASS[method]}
            >
              {method}
            </Badge>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'path_pattern',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Padrão de rota" />
        ),
        cell: ({ row }) => (
          <span className="font-mono">{row.original.path_pattern}</span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'action',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ação" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.action}
          </Badge>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Descrição" />
        ),
        cell: ({ row }) => (
          <span
            className="block max-w-[280px] whitespace-normal break-words line-clamp-2!"
            title={row.original.description || undefined}
          >
            {row.original.description || '—'}
          </span>
        ),
        size: 280,
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Criado em" />
        ),
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleDateString('pt-BR'),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setMappingToDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 32,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [openEdit]
  )

  const table = useReactTable({
    data: mappings ?? [],
    columns,
    getRowId: row => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4">
        <p className="text-sm text-destructive font-medium">
          Erro ao carregar mapeamentos
        </p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SummaryCards
        loading={loadingAllMappings}
        items={[
          {
            label: 'Total de mapeamentos',
            value: totalMappings,
            icon: Network,
            tone: 'gray',
          },
          {
            label: 'Endpoints GET',
            value: getMappings,
            icon: ArrowDownToLine,
            tone: 'blue',
          },
          {
            label: 'Endpoints de escrita',
            value: writeMappings,
            icon: PenLine,
            tone: 'orange',
          },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
        <div className="w-full sm:max-w-sm space-y-2">
          <Label>Filtrar por ação</Label>
          <div className="flex gap-2">
            <Combobox
              options={
                allActions?.map(action => ({
                  value: action.name,
                  label: action.name,
                })) ?? []
              }
              value={actionFilter || undefined}
              onValueChange={setActionFilter}
              placeholder="Todas as ações"
              searchPlaceholder="Buscar ação..."
              emptyMessage="Nenhuma ação encontrada."
            />
            {actionFilter && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Limpar filtro"
                onClick={() => setActionFilter('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResolveOpen(true)}>
            <SearchCheck className="mr-2 h-4 w-4" />
            Testar resolução
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo mapeamento
          </Button>
        </div>
      </div>

      <DataTable table={table} loading={isLoading} onRowClick={openEdit} />

      <MappingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mapping={mappingToEdit}
      />

      <ResolveMappingDialog open={resolveOpen} onOpenChange={setResolveOpen} />

      <ConfirmDialog
        open={!!mappingToDelete}
        onOpenChange={open => {
          if (!open) setMappingToDelete(null)
        }}
        title="Excluir mapeamento?"
        description={`Tem certeza que deseja excluir o mapeamento ${mappingToDelete?.method ?? ''} ${mappingToDelete?.path_pattern ?? ''}? O endpoint deixará de exigir a ação "${mappingToDelete?.action ?? ''}".`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={() => {
          if (mappingToDelete) {
            deleteMapping.mutate(mappingToDelete.id)
          }
          setMappingToDelete(null)
        }}
      />
    </div>
  )
}
