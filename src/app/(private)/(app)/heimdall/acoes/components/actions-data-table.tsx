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
import type { AppRoutersActionsActionResponse } from '@/http-heimdall/models'
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import * as React from 'react'
import {
  useDeleteAction,
  useHeimdallActions,
} from '../../hooks/use-heimdall-actions'
import { ActionFormDialog } from './action-form-dialog'

export function ActionsDataTable() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [formOpen, setFormOpen] = React.useState(false)
  const [actionToEdit, setActionToEdit] =
    React.useState<AppRoutersActionsActionResponse | null>(null)
  const [actionToDelete, setActionToDelete] =
    React.useState<AppRoutersActionsActionResponse | null>(null)

  const { data, isLoading, error, refetch } = useHeimdallActions({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  })
  const deleteAction = useDeleteAction()

  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  const openEdit = React.useCallback(
    (action: AppRoutersActionsActionResponse) => {
      setActionToEdit(action)
      setFormOpen(true)
    },
    []
  )

  const columns = React.useMemo<ColumnDef<AppRoutersActionsActionResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.name}</span>
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
          <span className="line-clamp-2">
            {row.original.description || '—'}
          </span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'endpoint_count',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Endpoints mapeados" />
        ),
        cell: ({ row }) => {
          const count = row.original.endpoint_count ?? 0
          return (
            <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
          )
        },
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
                onClick={() => setActionToDelete(row.original)}
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
    data: data?.actions ?? [],
    columns,
    getRowId: row => String(row.id),
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    rowCount: total,
  })

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4">
        <p className="text-sm text-destructive font-medium">
          Erro ao carregar ações
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
      <DataTable table={table} loading={isLoading} onRowClick={openEdit} />

      <ActionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        action={actionToEdit}
      />

      <ConfirmDialog
        open={!!actionToDelete}
        onOpenChange={open => {
          if (!open) setActionToDelete(null)
        }}
        title="Excluir ação?"
        description={`Tem certeza que deseja excluir a ação "${actionToDelete?.name ?? ''}"? Todos os mapeamentos de endpoint associados também serão removidos. Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={() => {
          if (actionToDelete) {
            deleteAction.mutate(actionToDelete.id)
          }
          setActionToDelete(null)
        }}
      />
    </div>
  )
}
