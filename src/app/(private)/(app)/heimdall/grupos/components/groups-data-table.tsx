'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  type GroupWithCount,
  useDeleteGroup,
  useHeimdallGroups,
} from '../../hooks/use-heimdall-groups'
import { GroupFormDialog } from './group-form-dialog'

export function GroupsDataTable() {
  const router = useRouter()
  const [prefixInput, setPrefixInput] = React.useState('')
  const [prefix, setPrefix] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [groupToDelete, setGroupToDelete] =
    React.useState<GroupWithCount | null>(null)

  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useHeimdallGroups(prefix || undefined)
  const deleteGroup = useDeleteGroup()

  const debouncedSetPrefix = useDebouncedCallback((value: string) => {
    setPrefix(value)
  }, 300)

  const columns = React.useMemo<ColumnDef<GroupWithCount>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.name}</span>
        ),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Descrição" />
        ),
        cell: ({ row }) => (
          <span className="line-clamp-2">{row.original.description}</span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'member_count',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Membros" />
        ),
        cell: ({ row }) => {
          const count = row.original.member_count ?? 0
          return (
            <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'created_by',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Criado por" />
        ),
        cell: ({ row }) => row.original.created_by || '—',
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
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/heimdall/grupos/${row.original.name}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setGroupToDelete(row.original)}
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
    [router]
  )

  const table = useReactTable({
    data: groups ?? [],
    columns,
    getRowId: row => row.name,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4">
        <p className="text-sm text-destructive font-medium">
          Erro ao carregar grupos
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
      <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
        <div className="w-full sm:max-w-sm space-y-2">
          <Label htmlFor="group-prefix">Filtrar por prefixo</Label>
          <Input
            id="group-prefix"
            placeholder="ex: go:"
            value={prefixInput}
            onChange={event => {
              setPrefixInput(event.target.value)
              debouncedSetPrefix(event.target.value.trim())
            }}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo grupo
        </Button>
      </div>

      <DataTable
        table={table}
        loading={isLoading}
        onRowClick={group => router.push(`/heimdall/grupos/${group.name}`)}
      />

      <GroupFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!groupToDelete}
        onOpenChange={open => {
          if (!open) setGroupToDelete(null)
        }}
        title="Excluir grupo?"
        description={`Tem certeza que deseja excluir o grupo "${groupToDelete?.name ?? ''}"? Todos os membros e papéis atribuídos serão removidos. Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={() => {
          if (groupToDelete) {
            deleteGroup.mutate(groupToDelete.name)
          }
          setGroupToDelete(null)
        }}
      />
    </div>
  )
}
