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
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { AppRoutersRolesActionResponse } from '@/http-heimdall/models'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { useAllHeimdallActions } from '../../../hooks/use-heimdall-actions'
import {
  useAssignActionToRole,
  useRemoveActionFromRole,
  useRoleActions,
} from '../../../hooks/use-heimdall-roles'

export function RoleActionsSection({ roleName }: { roleName: string }) {
  const [selectedAction, setSelectedAction] = React.useState('')
  const [actionToRemove, setActionToRemove] =
    React.useState<AppRoutersRolesActionResponse | null>(null)

  const { data: roleActions, isLoading, error } = useRoleActions(roleName)
  const { data: allActions, isLoading: loadingAllActions } =
    useAllHeimdallActions()
  const assignAction = useAssignActionToRole(roleName)
  const removeAction = useRemoveActionFromRole(roleName)

  const availableActions = React.useMemo(() => {
    if (!allActions) return []
    const assigned = new Set(roleActions?.map(action => action.name) ?? [])
    return allActions.filter(action => !assigned.has(action.name))
  }, [allActions, roleActions])

  const handleAssign = () => {
    if (!selectedAction) return
    assignAction.mutate(selectedAction, {
      onSuccess: () => setSelectedAction(''),
    })
  }

  const columns = React.useMemo<ColumnDef<AppRoutersRolesActionResponse>[]>(
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
        id: 'actions',
        header: () => <span className="sr-only">Ações da linha</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover ação do papel"
            className="text-destructive hover:text-destructive"
            disabled={removeAction.isPending}
            onClick={() => setActionToRemove(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        size: 32,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [removeAction.isPending]
  )

  const table = useReactTable({
    data: roleActions ?? [],
    columns,
    getRowId: row => row.name,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações do papel</CardTitle>
        <CardDescription>
          Ações (permissões) que este papel pode executar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-80">
            <Combobox
              options={availableActions.map(action => ({
                value: action.name,
                label: action.name,
              }))}
              value={selectedAction || undefined}
              onValueChange={setSelectedAction}
              placeholder={
                loadingAllActions
                  ? 'Carregando ações...'
                  : availableActions.length === 0
                    ? 'Nenhuma ação disponível'
                    : 'Selecione uma ação'
              }
              searchPlaceholder="Buscar ação..."
              emptyMessage="Nenhuma ação encontrada."
              disabled={loadingAllActions || availableActions.length === 0}
            />
          </div>
          <Button
            onClick={handleAssign}
            disabled={!selectedAction || assignAction.isPending}
          >
            {assignAction.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar ação
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            Erro ao carregar ações: {error.message}
          </p>
        ) : (
          <DataTable table={table} loading={isLoading} />
        )}
      </CardContent>

      <ConfirmDialog
        open={!!actionToRemove}
        onOpenChange={open => {
          if (!open) setActionToRemove(null)
        }}
        title="Remover ação do papel?"
        description={`Tem certeza que deseja remover a ação "${actionToRemove?.name ?? ''}" do papel? Os grupos com este papel perderão a permissão.`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={() => {
          if (actionToRemove) {
            removeAction.mutate(actionToRemove.name)
          }
          setActionToRemove(null)
        }}
      />
    </Card>
  )
}
