'use client'

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
  Calendar,
  CheckCircle,
  Clock,
  Hash,
  Mail,
  MapPin,
  Phone,
  Text,
  User,
  XCircle,
} from 'lucide-react'
import * as React from 'react'

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
import {
  useCandidatos,
  type Candidato,
  type CandidatoStatus,
} from '@/hooks/use-candidatos'
import { toast } from 'sonner'

interface CandidatesTableProps {
  empregabilidadeId: string
  empregabilidadeTitle?: string
}

export function CandidatesTable({
  empregabilidadeId,
  empregabilidadeTitle,
}: CandidatesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'enrollmentDate', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedCandidato, setSelectedCandidato] =
    React.useState<Candidato | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  // Convert column filters to candidato filters
  const filters = React.useMemo(() => {
    const statusFilter = columnFilters.find(filter => filter.id === 'status')
    const candidateNameFilter = columnFilters.find(
      filter => filter.id === 'candidateName'
    )

    const statusValue = statusFilter?.value as CandidatoStatus[] | undefined
    const statusArray =
      statusValue && Array.isArray(statusValue) && statusValue.length > 0
        ? statusValue
        : undefined

    return {
      status: statusArray,
      search: candidateNameFilter?.value as string,
    }
  }, [columnFilters])

  // Use the custom hook to fetch candidatos
  const {
    candidatos,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateCandidatoStatus,
    updateMultipleCandidatoStatuses,
    refetch,
  } = useCandidatos({
    empregabilidadeId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    filters,
  })

  const handleConfirmCandidato = React.useCallback(
    async (candidato: Candidato) => {
      try {
        const updated = await updateCandidatoStatus(candidato.id, 'approved')
        if (updated) {
          setSelectedCandidato(prev =>
            prev ? { ...prev, status: 'approved' } : prev
          )
          toast.success('Candidato confirmado com sucesso!')
        }
      } catch (error) {
        console.error('Erro ao confirmar candidato:', error)
        toast.error('Erro ao confirmar candidato', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoStatus]
  )

  const handleCancelCandidato = React.useCallback(
    async (candidato: Candidato) => {
      try {
        const updated = await updateCandidatoStatus(candidato.id, 'rejected')
        if (updated) {
          setSelectedCandidato(prev =>
            prev ? { ...prev, status: 'rejected' } : prev
          )
          toast.success('Candidato recusado!')
        }
      } catch (error) {
        console.error('Erro ao recusar candidato:', error)
        toast.error('Erro ao recusar candidato', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoStatus]
  )

  const handlePaginationChange = React.useCallback(
    (updater: any) => {
      setPagination(prev => {
        const newPagination =
          typeof updater === 'function' ? updater(prev) : updater
        return newPagination
      })
    },
    []
  )

  const handleRowClick = React.useCallback(
    (candidato: Candidato) => {
      setSelectedCandidato(candidato)
      setIsSheetOpen(true)
    },
    []
  )

  const columns = React.useMemo<ColumnDef<Candidato>[]>(
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
        id: 'candidateName',
        accessorKey: 'candidateName',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Candidato" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Candidato['candidateName']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Candidato',
          placeholder: 'Buscar candidato por nome, cpf ou email',
          variant: 'text',
          icon: User,
        },
        enableColumnFilter: true,
      },
      {
        id: 'cpf',
        accessorKey: 'cpf',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ cell }) => (
          <span className="font-mono text-sm">
            {cell.getValue<Candidato['cpf']>()}
          </span>
        ),
        meta: {
          label: 'CPF',
          placeholder: 'Buscar CPF...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: false,
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="E-mail" />
        ),
        cell: ({ cell }) => (
          <span className="text-sm text-muted-foreground">
            {cell.getValue<Candidato['email']>()}
          </span>
        ),
      },
      {
        id: 'enrollmentDate',
        accessorKey: 'enrollmentDate',
        accessorFn: row => {
          const isoDate = new Date(row.enrollmentDate)
          const date = new Date(
            isoDate.getFullYear(),
            isoDate.getMonth(),
            isoDate.getDate()
          )
          return date.getTime()
        },
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de Inscrição" />
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
        meta: {
          label: 'Data de Inscrição',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Candidato['status']>()
          const statusConfig = {
            approved: {
              label: 'Aprovado',
              variant: 'default' as const,
              className: 'bg-green-100 text-green-800',
              icon: CheckCircle,
            },
            pending: {
              label: 'Pendente',
              variant: 'default' as const,
              className: 'bg-yellow-100 text-yellow-800',
              icon: Clock,
            },
            cancelled: {
              label: 'Cancelado',
              variant: 'secondary' as const,
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
            rejected: {
              label: 'Recusado',
              variant: 'secondary' as const,
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
          }

          const config = statusConfig[status]
          const StatusIcon = config.icon

          return (
            <Badge variant={config.variant} className={config.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          if (Array.isArray(value)) {
            return value.includes(rowValue)
          }
          return value === rowValue
        },
        meta: {
          label: 'Status',
          variant: 'multiSelect',
          options: [
            { label: 'Aprovado', value: 'approved' },
            { label: 'Pendente', value: 'pending' },
            { label: 'Cancelado', value: 'cancelled' },
            { label: 'Recusado', value: 'rejected' },
          ],
        },
        enableColumnFilter: true,
      },
    ],
    []
  )

  const table = useReactTable({
    data: candidatos,
    columns,
    getRowId: row => row.id,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: apiPagination?.totalPages || 0,
    rowCount: apiPagination?.total || 0,
  })

  const handleBulkConfirmCandidatos = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const candidatosToConfirm = selectedRows
        .map(row => row.original)
        .filter(candidato => candidato.status !== 'approved')

      if (candidatosToConfirm.length === 0) {
        return
      }

      const candidatoIds = candidatosToConfirm.map(c => c.id)
      const success = await updateMultipleCandidatoStatuses(
        candidatoIds,
        'approved'
      )

      if (success) {
        table.resetRowSelection()
        toast.success(
          `${candidatosToConfirm.length} candidato(s) confirmado(s) com sucesso!`
        )
      }
    } catch (error) {
      console.error('Erro ao confirmar candidatos em lote:', error)
      toast.error('Erro ao confirmar candidatos', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoStatuses])

  const handleBulkSetPending = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const candidatosToSetPending = selectedRows
        .map(row => row.original)
        .filter(candidato => candidato.status !== 'pending')

      if (candidatosToSetPending.length === 0) {
        return
      }

      const candidatoIds = candidatosToSetPending.map(c => c.id)
      const success = await updateMultipleCandidatoStatuses(
        candidatoIds,
        'pending'
      )

      if (success) {
        table.resetRowSelection()
        toast.success(
          `${candidatosToSetPending.length} candidato(s) definido(s) como pendente(s)!`
        )
      }
    } catch (error) {
      console.error('Erro ao definir candidatos como pendentes em lote:', error)
      toast.error('Erro ao definir candidatos como pendentes', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoStatuses])

  if (loading && candidatos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" className="mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Erro ao carregar candidatos</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {summary.total || 0}
              </p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {summary.pendingCount || 0}
              </p>
              <p className="text-sm text-yellow-600">Pendentes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.approvedCount || 0}
              </p>
              <p className="text-sm text-green-600">Aprovados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {summary.rejectedCount || 0}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Candidatura</SheetTitle>
            <SheetDescription>
              Informações completas do candidato e inscrição
            </SheetDescription>
          </SheetHeader>
          {selectedCandidato && (
            <>
              <div className="flex-1 overflow-y-auto py-6 pt-0 px-4">
                <div className="space-y-6">
                  {/* Candidate Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-lg">
                        <User className="w-6 h-6 bg-background-light" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedCandidato.candidateName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Candidato
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações Pessoais
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            CPF
                          </Label>
                          <p className="font-mono text-sm">
                            {selectedCandidato.cpf}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            E-mail
                          </Label>
                          <p className="text-sm">{selectedCandidato.email}</p>
                        </div>
                      </div>
                      {selectedCandidato.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Telefone
                            </Label>
                            <p className="text-sm">
                              {selectedCandidato.phone}
                            </p>
                          </div>
                        </div>
                      )}
                      {(selectedCandidato.address ||
                        selectedCandidato.neighborhood) && (
                        <>
                          {selectedCandidato.address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Endereço
                                </Label>
                                <p className="text-sm">
                                  {selectedCandidato.address}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedCandidato.neighborhood && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Bairro
                                </Label>
                                <p className="text-sm">
                                  {selectedCandidato.neighborhood}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Application Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações da Candidatura
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Data de Inscrição
                          </Label>
                          <p>
                            {new Date(
                              selectedCandidato.enrollmentDate
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Status
                          </Label>
                          <div className="mt-1">
                            {(() => {
                              const statusConfig = {
                                approved: {
                                  label: 'Aprovado',
                                  className: 'bg-green-100 text-green-800',
                                },
                                pending: {
                                  label: 'Pendente',
                                  className: 'bg-yellow-100 text-yellow-800',
                                },
                                cancelled: {
                                  label: 'Cancelado',
                                  className:
                                    'text-red-600 border-red-200 bg-red-50',
                                },
                                rejected: {
                                  label: 'Recusado',
                                  className:
                                    'text-red-600 border-red-200 bg-red-50',
                                },
                              }
                              const config =
                                statusConfig[selectedCandidato.status]
                              return (
                                <Badge className={config.className}>
                                  {config.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {selectedCandidato.customFields &&
                    selectedCandidato.customFields.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Informações Complementares
                        </h4>
                        <div className="space-y-3">
                          {selectedCandidato.customFields.map(field => (
                            <div key={field.id} className="flex items-start gap-3">
                              <div className="flex-1">
                                <Label className="text-sm text-muted-foreground">
                                  {field.title}
                                </Label>
                                <div className="text-sm mt-1">
                                  <span className="font-medium">
                                    {field.value || (
                                      <span className="text-muted-foreground italic">
                                        (sem valor)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <SheetFooter className="flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={() => handleConfirmCandidato(selectedCandidato)}
                    className="w-full bg-green-50 border border-green-200 text-green-700 hover:bg-green-100!"
                    disabled={selectedCandidato.status === 'approved'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar candidato
                  </Button>
                  <Button
                    onClick={() => handleCancelCandidato(selectedCandidato)}
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100!"
                    disabled={selectedCandidato.status === 'pending'}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Definir como pendente
                  </Button>
                  <Button
                    onClick={() => handleCancelCandidato(selectedCandidato)}
                    variant="destructive"
                    className="w-full"
                    disabled={selectedCandidato.status === 'rejected'}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar candidato
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTable table={table} onRowClick={handleRowClick}>
        <DataTableToolbar table={table} />

        <DataTableActionBar table={table}>
          <DataTableActionBarSelection table={table} />
          <DataTableActionBarAction
            tooltip="Aprovar todos os candidatos selecionados"
            onClick={handleBulkConfirmCandidatos}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprovar candidatos
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir todos os candidatos selecionados como pendentes"
            onClick={handleBulkSetPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendente
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>
    </div>
  )
}
