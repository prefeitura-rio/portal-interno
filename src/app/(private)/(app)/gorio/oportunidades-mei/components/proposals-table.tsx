'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileDown,
  Hash,
  Mail,
  MapPin,
  Phone,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { DataTable } from '@/components/data-table/data-table'
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from '@/components/data-table/data-table-action-bar'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { type MEIProposal, useMEIProposals } from '@/hooks/use-mei-proposals'
import { toast } from 'sonner'

interface ProposalsTableProps {
  opportunityId: number
  opportunityTitle?: string
}

// Simple schema just to keep consistent form usage (not many validations needed here)
const proposalNoteSchema = z.object({ note: z.string().optional() })
type ProposalNoteForm = z.infer<typeof proposalNoteSchema>

export function ProposalsTable({
  opportunityId,
  opportunityTitle,
}: ProposalsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedProposal, setSelectedProposal] =
    React.useState<MEIProposal | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const noteForm = useForm<ProposalNoteForm>({
    resolver: zodResolver(proposalNoteSchema),
    defaultValues: { note: '' },
  })

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, 300)

  // Handle search filter changes
  React.useEffect(() => {
    const companyNameFilter = columnFilters.find(
      filter => filter.id === 'companyName'
    )
    const newSearchQuery = (companyNameFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      debouncedSearch(newSearchQuery)
    }
  }, [columnFilters, searchQuery, debouncedSearch])

  // Convert column filters to API filters
  const filters = React.useMemo(() => {
    const statusFilter = columnFilters.find(filter => filter.id === 'status')

    const statusValue = statusFilter?.value as string
    const status =
      statusValue && statusValue !== ''
        ? (statusValue as 'approved' | 'pending' | 'rejected')
        : undefined

    return {
      status,
      search: searchQuery || undefined,
    }
  }, [columnFilters, searchQuery])

  const {
    proposals,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateStatus,
    updateMultipleStatuses,
  } = useMEIProposals({
    opportunityId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    filters,
  })

  const handlePaginationChange = React.useCallback(
    (
      updater: PaginationState | ((prev: PaginationState) => PaginationState)
    ) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater
      setPagination(newPagination)
    },
    [pagination]
  )

  React.useEffect(() => {
    if (selectedProposal && proposals.length > 0) {
      const updated = proposals.find(p => p.id === selectedProposal.id)
      if (updated) setSelectedProposal(updated)
    }
  }, [proposals, selectedProposal])

  const handleRowClick = React.useCallback(
    (proposal: MEIProposal) => {
      setSelectedProposal(proposal)
      setIsSheetOpen(true)
      noteForm.reset({ note: '' })
    },
    [noteForm]
  )

  const handleApprove = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'approved')
      if (updated) toast.success('Proposta confirmada com sucesso!')
    },
    [updateStatus]
  )

  const handleSetPending = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'pending')
      if (updated) toast.success('Proposta definida como pendente!')
    },
    [updateStatus]
  )

  const handleReject = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'rejected')
      if (updated) toast.success('Proposta recusada!')
    },
    [updateStatus]
  )

  const handleBulkApprove = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toApprove = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'approved')
      if (toApprove.length === 0) return
      const ids = toApprove.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'approved')
      if (success) {
        table.resetRowSelection()
        toast.success(`${toApprove.length} proposta(s) confirmada(s)!`)
      }
    },
    [updateMultipleStatuses]
  )

  const handleBulkPending = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toPending = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'pending')
      if (toPending.length === 0) return
      const ids = toPending.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'pending')
      if (success) {
        table.resetRowSelection()
        toast.success(
          `${toPending.length} proposta(s) definida(s) como pendente(s)!`
        )
      }
    },
    [updateMultipleStatuses]
  )

  const handleBulkReject = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toReject = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'rejected')
      if (toReject.length === 0) return
      const ids = toReject.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'rejected')
      if (success) {
        table.resetRowSelection()
        toast.success(`${toReject.length} proposta(s) recusada(s)!`)
      }
    },
    [updateMultipleStatuses]
  )

  const handleDownloadSpreadsheet = React.useCallback(() => {
    const proposalsToExport = proposals
    if (proposalsToExport.length === 0) return

    const headers = [
      'Nome da empresa',
      'CNPJ',
      'Valor da proposta',
      'Data de envio',
      'Status',
      'E-mail',
      'Telefone',
      'Endereço',
    ]
    const csvContent = [
      headers,
      ...proposalsToExport.map(p => [
        p.companyName,
        p.cnpj,
        p.amount.toString().replace('.', ','),
        new Date(p.submittedAt).toLocaleDateString('pt-BR'),
        p.status,
        p.email,
        p.phone || '',
        p.address || '',
      ]),
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const fileName = opportunityTitle
      ? `propostas_${opportunityTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}`
      : `propostas_oportunidade_${opportunityId}`
    link.setAttribute('download', `${fileName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [proposals, opportunityId, opportunityTitle])

  const columns = React.useMemo<ColumnDef<MEIProposal>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'companyName',
        accessorKey: 'companyName',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Nome da empresa" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<MEIProposal['companyName']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Empresa/CNPJ',
          placeholder: 'Buscar por empresa ou CNPJ',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: true,
      },
      {
        id: 'cnpj',
        accessorKey: 'cnpj',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="CNPJ" />
        ),
        cell: ({ cell }) => (
          <span className="font-mono text-sm">
            {cell.getValue<MEIProposal['cnpj']>()}
          </span>
        ),
        enableColumnFilter: false,
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Valor da proposta" />
        ),
        cell: ({ cell }) => {
          const value = cell.getValue<number>()
          return (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                {value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'submittedAt',
        accessorKey: 'submittedAt',
        accessorFn: row => {
          // Parse ISO date string as local date to avoid timezone issues
          const isoDate = new Date(row.submittedAt)
          const date = new Date(
            isoDate.getFullYear(),
            isoDate.getMonth(),
            isoDate.getDate()
          )
          return date.getTime()
        },
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de envio" />
        ),
        cell: ({ cell }) => {
          const timestamp = cell.getValue<number>()
          const date = new Date(timestamp)
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<MEIProposal['status']>()
          const statusConfig = {
            approved: {
              label: 'Confirmado',
              className: 'bg-green-100 text-green-800',
              icon: CheckCircle,
            },
            pending: {
              label: 'Pendente',
              className: 'bg-yellow-100 text-yellow-800',
              icon: Clock,
            },
            rejected: {
              label: 'Recusado',
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
          } as const
          const config = statusConfig[status]
          const StatusIcon = config.icon
          return (
            <Badge className={config.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          return value === rowValue
        },
        meta: {
          label: 'Status',
          variant: 'select',
          options: [
            { label: 'Todos', value: '' },
            { label: 'Confirmado', value: 'approved' },
            { label: 'Pendente', value: 'pending' },
            { label: 'Recusado', value: 'rejected' },
          ],
        },
        enableColumnFilter: true,
      },
    ],
    []
  )

  const table = useReactTable({
    data: proposals,
    columns,
    getRowId: row => row.id,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true, // Filters are applied server-side via API
    pageCount: apiPagination?.totalPages || 0,
    rowCount: apiPagination?.total || 0,
  })

  // Show loading state only on initial load (no data yet)
  if (loading && proposals.length === 0 && !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando propostas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && proposals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar propostas
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        <Button variant="outline" onClick={handleDownloadSpreadsheet}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.approvedCount}
              </p>
              <p className="text-sm text-green-600">Confirmados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {summary.pendingCount}
              </p>
              <p className="text-sm text-yellow-600">Pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {summary.rejectedCount}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Proposta</SheetTitle>
            <SheetDescription>
              Informações completas da empresa
            </SheetDescription>
          </SheetHeader>
          {selectedProposal && (
            <>
              <div className="flex-1 overflow-y-auto py-6 pt-0 px-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-lg">
                        <Building2 className="w-6 h-6 bg-background-light" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedProposal.companyName}
                        </h3>
                        <p className="text-sm text-muted-foreground">Empresa</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            CNPJ
                          </Label>
                          <p className="font-mono text-sm">
                            {selectedProposal.cnpj}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Valor da proposta
                          </Label>
                          <p className="text-sm">
                            {selectedProposal.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Data de envio
                          </Label>
                          <p>
                            {new Date(
                              selectedProposal.submittedAt
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Contato
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            E-mail
                          </Label>
                          <p className="text-sm">{selectedProposal.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Telefone
                          </Label>
                          <p className="text-sm">{selectedProposal.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Endereço
                          </Label>
                          <p className="text-sm">{selectedProposal.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  <Button
                    onClick={() => handleApprove(selectedProposal)}
                    className="w-full bg-green-50 border border-green-200 text-green-700"
                    disabled={selectedProposal.status === 'approved'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar proposta
                  </Button>
                  <Button
                    onClick={() => handleSetPending(selectedProposal)}
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700"
                    disabled={selectedProposal.status === 'pending'}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Deixar pendente
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedProposal)}
                    className="w-full bg-red-50! border border-red-200 text-red-700"
                    disabled={selectedProposal.status === 'rejected'}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar proposta
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
        <DataTableToolbar table={table} />

        <DataTableActionBar table={table}>
          <DataTableActionBarSelection table={table} />
          <DataTableActionBarAction
            tooltip="Confirmar propostas selecionadas"
            onClick={() => handleBulkApprove(table)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar propostas
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir propostas selecionadas como pendentes"
            onClick={() => handleBulkPending(table)}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendentes
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Recusar propostas selecionadas"
            onClick={() => handleBulkReject(table)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Recusar propostas
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Exportar propostas para CSV"
            onClick={handleDownloadSpreadsheet}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar CSV
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>
    </div>
  )
}
