'use client'

import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import type { ModelsRedirectRule } from '@/http-redirecionamentos/models'
import {
  type PaginationState,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import * as React from 'react'
import {
  useBulkUpdateRedirectStatus,
  useDeleteRedirect,
  useRedirects,
  useUpdateRedirect,
} from '../hooks/use-redirects'
import { RedirectFormDialog } from './redirect-form-dialog'
import { createRedirectsColumns } from './redirects-columns'
import { RedirectsTableToolbar } from './redirects-table-toolbar'
import { RuleHistoryDialog } from './rule-history-dialog'

interface RedirectsDataTableProps {
  canonicalHosts: readonly string[]
}

export function RedirectsDataTable({
  canonicalHosts,
}: RedirectsDataTableProps) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [pageSize, setPageSize] = useQueryState(
    'pageSize',
    parseAsInteger.withDefault(20)
  )
  const [hostFilter, setHostFilter] = useQueryState(
    'host',
    parseAsString.withDefault('')
  )
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault('')
  )
  const [ativaFilter, setAtivaFilter] = useQueryState(
    'ativa',
    parseAsString.withDefault('')
  )
  const [qFilter, setQFilter] = useQueryState(
    'q',
    parseAsString.withDefault('')
  )

  const [searchInput, setSearchInput] = React.useState(qFilter)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [ruleToEdit, setRuleToEdit] = React.useState<ModelsRedirectRule | null>(
    null
  )
  const [ruleForHistory, setRuleForHistory] =
    React.useState<ModelsRedirectRule | null>(null)
  const [ruleToDelete, setRuleToDelete] =
    React.useState<ModelsRedirectRule | null>(null)
  const [bulkConfirm301Open, setBulkConfirm301Open] = React.useState(false)

  React.useEffect(() => {
    setSearchInput(qFilter)
  }, [qFilter])

  const debouncedSetQ = useDebouncedCallback((value: string) => {
    void setQFilter(value || null)
    void setPage(1)
  }, 300)

  const { data, isLoading, error, refetch } = useRedirects({
    page,
    pageSize,
    host: hostFilter || undefined,
    q: qFilter || undefined,
    enabled:
      ativaFilter === 'true'
        ? true
        : ativaFilter === 'false'
          ? false
          : undefined,
    status_code:
      statusFilter === '301' ? 301 : statusFilter === '302' ? 302 : undefined,
  })

  const updateRedirect = useUpdateRedirect()
  const deleteRedirect = useDeleteRedirect()
  const bulkUpdateStatus = useBulkUpdateRedirectStatus()

  const rules = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const handleToggleEnabled = React.useCallback(
    (rule: ModelsRedirectRule, checked: boolean) => {
      if (
        !rule.id ||
        !rule.host ||
        !rule.path ||
        !rule.destination ||
        !rule.match_type ||
        !rule.status_code
      ) {
        return
      }
      updateRedirect.mutate({
        id: rule.id,
        body: {
          host: rule.host,
          path: rule.path,
          match_type: rule.match_type,
          destination: rule.destination,
          status_code: rule.status_code,
          enabled: checked,
          notes: rule.notes,
        },
      })
    },
    [updateRedirect]
  )

  const columns = React.useMemo(
    () =>
      createRedirectsColumns({
        onToggleEnabled: handleToggleEnabled,
        onEdit: setRuleToEdit,
        onHistory: setRuleForHistory,
        onDelete: setRuleToDelete,
      }),
    [handleToggleEnabled]
  )

  const paginationState = React.useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(0, page - 1), pageSize }),
    [page, pageSize]
  )

  const table = useReactTable({
    data: rules,
    columns,
    getRowId: row => String(row.id),
    state: { pagination: paginationState, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: updater => {
      const next =
        typeof updater === 'function' ? updater(paginationState) : updater
      void setPage(next.pageIndex + 1)
      void setPageSize(next.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
    rowCount: total,
  })

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map(r => r.original.id)
    .filter((id): id is number => typeof id === 'number')

  const executeBulkStatus = (statusCode: 301 | 302) => {
    if (selectedIds.length === 0) return
    bulkUpdateStatus.mutate(
      { ids: selectedIds, status_code: statusCode },
      { onSuccess: () => setRowSelection({}) }
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4">
        <p className="text-sm font-medium text-destructive">
          Erro ao carregar regras de redirecionamento
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
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
      <RedirectsTableToolbar
        canonicalHosts={canonicalHosts}
        selectedCount={selectedIds.length}
        filters={{
          searchInput,
          hostFilter,
          statusFilter,
          ativaFilter,
          hasActiveFilters: Boolean(
            hostFilter || statusFilter || ativaFilter || qFilter
          ),
        }}
        actions={{
          onSearchChange: value => {
            setSearchInput(value)
            debouncedSetQ(value)
          },
          onHostChange: val => {
            void setHostFilter(val === 'all' ? null : val)
            void setPage(1)
          },
          onStatusChange: val => {
            void setStatusFilter(val === 'all' ? null : val)
            void setPage(1)
          },
          onAtivaChange: val => {
            void setAtivaFilter(val === 'all' ? null : val)
            void setPage(1)
          },
          onClearFilters: () => {
            setSearchInput('')
            void setQFilter(null)
            void setHostFilter(null)
            void setStatusFilter(null)
            void setAtivaFilter(null)
            void setPage(1)
          },
          onBulkStatus302: () => executeBulkStatus(302),
          onBulkStatus301: () => setBulkConfirm301Open(true),
        }}
      />

      <DataTable
        table={table}
        loading={isLoading}
        emptyMessage="Nenhuma regra cadastrada"
        onRowClick={rule => setRuleToEdit(rule)}
      />

      <RedirectFormDialog
        open={ruleToEdit !== null}
        onOpenChange={open => !open && setRuleToEdit(null)}
        rule={ruleToEdit}
        canonicalHosts={canonicalHosts}
      />
      <RuleHistoryDialog
        open={ruleForHistory !== null}
        onOpenChange={open => !open && setRuleForHistory(null)}
        rule={ruleForHistory}
      />
      <ConfirmDialog
        open={ruleToDelete !== null}
        onOpenChange={open => !open && setRuleToDelete(null)}
        title="Excluir regra?"
        description="Quem acessar esta URL vai ver o aviso de portal desativado e ir para a home do pref.rio."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (ruleToDelete?.id) deleteRedirect.mutate(ruleToDelete.id)
          setRuleToDelete(null)
        }}
      />
      <ConfirmDialog
        open={bulkConfirm301Open}
        onOpenChange={setBulkConfirm301Open}
        title="Tornar permanente (301)?"
        description="O navegador de quem acessar guarda este redirecionamento. Se o destino estiver errado, não há como corrigir para essas pessoas. Confirme que o destino foi testado."
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          executeBulkStatus(301)
          setBulkConfirm301Open(false)
        }}
      />
    </div>
  )
}
