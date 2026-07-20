'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserResponse } from '@/http-heimdall/models'
import {
  type ColumnDef,
  type PaginationState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Crown, Eye, Loader2, Search, X } from 'lucide-react'
import * as React from 'react'
import {
  useHeimdallUserByCpf,
  useHeimdallUsers,
} from '../../hooks/use-heimdall-users'
import { UserDetailsDialog } from './user-details-dialog'

function formatCpf(cpf: string): string {
  if (!/^\d{11}$/.test(cpf)) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function isAdminUser(user: UserResponse): boolean {
  return (
    user.roles?.some(role => role === 'admin' || role === 'superadmin') ?? false
  )
}

export function UsersDataTable() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [cpfInput, setCpfInput] = React.useState('')
  const [cpfSearch, setCpfSearch] = React.useState('')
  const [selectedUser, setSelectedUser] = React.useState<UserResponse | null>(
    null
  )

  const usersQuery = useHeimdallUsers({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
  })
  const userByCpfQuery = useHeimdallUserByCpf(cpfSearch)

  const isSearching = /^\d{11}$/.test(cpfSearch)

  const users: UserResponse[] = React.useMemo(() => {
    if (isSearching) {
      return userByCpfQuery.data ? [userByCpfQuery.data] : []
    }
    return usersQuery.data?.items ?? []
  }, [isSearching, userByCpfQuery.data, usersQuery.data])

  const total = isSearching ? users.length : (usersQuery.data?.total ?? 0)
  const pageCount = isSearching
    ? 1
    : Math.max(1, Math.ceil(total / pagination.pageSize))

  const columns = React.useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: 'cpf',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ row }) => (
          <span className="font-mono">{formatCpf(row.original.cpf)}</span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'display_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.display_name || '—'}</span>
            {isAdminUser(row.original) && (
              <Crown
                className="h-4 w-4 text-amber-500 shrink-0"
                aria-label="Administrador"
              />
            )}
          </div>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'groups',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Grupos" />
        ),
        cell: ({ row }) => {
          const count = row.original.groups?.length ?? 0
          return (
            <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
          )
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'roles',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Papéis" />
        ),
        cell: ({ row }) => {
          const count = row.original.roles?.length ?? 0
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ver detalhes do usuário"
            onClick={() => setSelectedUser(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
        size: 32,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    []
  )

  const table = useReactTable({
    data: users,
    columns,
    getRowId: row => row.cpf,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    rowCount: total,
  })

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setCpfSearch(cpfInput)
  }

  const handleClearSearch = () => {
    setCpfInput('')
    setCpfSearch('')
  }

  const loading = isSearching ? userByCpfQuery.isLoading : usersQuery.isLoading

  const error = isSearching ? userByCpfQuery.error : usersQuery.error

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-3 items-end max-w-xl"
      >
        <div className="flex-1 w-full space-y-2">
          <Label htmlFor="cpf-search">Buscar por CPF</Label>
          <Input
            id="cpf-search"
            placeholder="Somente números (11 dígitos)"
            value={cpfInput}
            inputMode="numeric"
            maxLength={11}
            onChange={event =>
              setCpfInput(event.target.value.replace(/\D/g, '').slice(0, 11))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!/^\d{11}$/.test(cpfInput) || userByCpfQuery.isFetching}
          >
            {userByCpfQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Buscar
          </Button>
          {isSearching && (
            <Button type="button" variant="outline" onClick={handleClearSearch}>
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </form>

      {error ? (
        <div className="rounded-md border border-destructive p-4">
          <p className="text-sm text-destructive font-medium">
            {isSearching
              ? 'Usuário não encontrado ou erro na busca'
              : 'Erro ao carregar usuários'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      ) : (
        <DataTable
          table={table}
          loading={loading}
          onRowClick={user => setSelectedUser(user)}
        />
      )}

      <UserDetailsDialog
        user={selectedUser}
        onOpenChange={open => {
          if (!open) setSelectedUser(null)
        }}
      />
    </div>
  )
}
