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
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  type RoleWithActionCount,
  useDeleteRole,
  useHeimdallRoles,
} from '../../hooks/use-heimdall-roles'
import { SYSTEM_BADGE_CLASS } from '../../lib/tones'

export function RolesDataTable() {
  const router = useRouter()
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [roleToDelete, setRoleToDelete] =
    React.useState<RoleWithActionCount | null>(null)

  const { data, isLoading, error, refetch } = useHeimdallRoles({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  })
  const deleteRole = useDeleteRole()

  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))

  const columns = React.useMemo<ColumnDef<RoleWithActionCount>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">{row.original.name}</span>
            {!row.original.created_at && (
              <Badge variant="outline" className={SYSTEM_BADGE_CLASS}>
                Sistema
              </Badge>
            )}
          </div>
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
          <span className="line-clamp-2">{row.original.description}</span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'action_count',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ações" />
        ),
        cell: ({ row }) => {
          const count = row.original.action_count ?? 0
          return (
            <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Ações da linha</span>,
        cell: ({ row }) => {
          const isSystemRole = !row.original.created_at
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/heimdall/papeis/${row.original.name}`)
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalhes
                </DropdownMenuItem>
                {!isSystemRole && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setRoleToDelete(row.original)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 32,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [router]
  )

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getRowId: row => row.name,
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
          Erro ao carregar papéis
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
      <DataTable
        table={table}
        loading={isLoading}
        onRowClick={role => router.push(`/heimdall/papeis/${role.name}`)}
      />

      <ConfirmDialog
        open={!!roleToDelete}
        onOpenChange={open => {
          if (!open) setRoleToDelete(null)
        }}
        title="Excluir papel?"
        description={`Tem certeza que deseja excluir o papel "${roleToDelete?.name ?? ''}"? Ele será removido de todos os grupos. Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={() => {
          if (roleToDelete) {
            deleteRole.mutate(roleToDelete.name)
          }
          setRoleToDelete(null)
        }}
      />
    </div>
  )
}
