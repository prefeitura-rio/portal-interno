'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GroupMemberResponse } from '@/http-heimdall/models'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import * as React from 'react'
import {
  useAddGroupMember,
  useGroupMembers,
  useRemoveGroupMember,
} from '../../../hooks/use-heimdall-groups'

function formatCpf(cpf: string): string {
  if (!/^\d{11}$/.test(cpf)) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function GroupMembersSection({ groupName }: { groupName: string }) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [cpfInput, setCpfInput] = React.useState('')
  const [memberToRemove, setMemberToRemove] =
    React.useState<GroupMemberResponse | null>(null)

  const { data: members, isLoading, error } = useGroupMembers(groupName)
  const addMember = useAddGroupMember(groupName)
  const removeMember = useRemoveGroupMember(groupName)

  const columns = React.useMemo<ColumnDef<GroupMemberResponse>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ row }) => (
          <span className="font-mono">{formatCpf(row.original.subject)}</span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'display_name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => row.original.display_name || '—',
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'joined_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Entrou em" />
        ),
        cell: ({ row }) =>
          new Date(row.original.joined_at).toLocaleDateString('pt-BR'),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'added_by',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Adicionado por" />
        ),
        cell: ({ row }) => row.original.added_by || '—',
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
            aria-label="Remover membro"
            className="text-destructive hover:text-destructive"
            disabled={removeMember.isPending}
            onClick={() => setMemberToRemove(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        size: 32,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [removeMember.isPending]
  )

  const table = useReactTable({
    data: members ?? [],
    columns,
    getRowId: row => row.subject,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault()
    addMember.mutate(cpfInput, {
      onSuccess: () => {
        setCpfInput('')
        setAddOpen(false)
      },
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Membros</CardTitle>
          <CardDescription>
            Usuários que pertencem a este grupo e herdam seus papéis.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar membro
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">
            Erro ao carregar membros: {error.message}
          </p>
        ) : (
          <DataTable table={table} loading={isLoading} />
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Informe o CPF do usuário que deseja adicionar ao grupo{' '}
              <span className="font-mono">{groupName}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-cpf">CPF</Label>
              <Input
                id="member-cpf"
                placeholder="Somente números (11 dígitos)"
                value={cpfInput}
                inputMode="numeric"
                maxLength={11}
                onChange={event =>
                  setCpfInput(
                    event.target.value.replace(/\D/g, '').slice(0, 11)
                  )
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!/^\d{11}$/.test(cpfInput) || addMember.isPending}
              >
                {addMember.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={open => {
          if (!open) setMemberToRemove(null)
        }}
        title="Remover membro?"
        description={`Tem certeza que deseja remover o CPF ${memberToRemove ? formatCpf(memberToRemove.subject) : ''} do grupo? O usuário perderá os papéis herdados deste grupo.`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={() => {
          if (memberToRemove) {
            removeMember.mutate(memberToRemove.subject)
          }
          setMemberToRemove(null)
        }}
      />
    </Card>
  )
}
