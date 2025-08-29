'use client'

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
import { useEnrollments } from '@/hooks/use-enrollments'
import type { Enrollment } from '@/types/course'
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
  FileDown,
  Hash,
  Mail,
  Phone,
  Text,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import * as React from 'react'

interface EnrollmentsTableProps {
  courseId: string
  courseTitle?: string
}

export function EnrollmentsTable({
  courseId,
  courseTitle,
}: EnrollmentsTableProps) {
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
  const [selectedEnrollment, setSelectedEnrollment] =
    React.useState<Enrollment | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  // Use the custom hook to fetch enrollments
  const {
    enrollments,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateEnrollmentStatus,
    updateMultipleEnrollmentStatuses,
  } = useEnrollments({
    courseId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  })

  const handleConfirmEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      const updated = await updateEnrollmentStatus(enrollment.id, 'confirmed')
      if (updated) {
        // Update the selected enrollment immediately with the new status
        setSelectedEnrollment(prev =>
          prev ? { ...prev, status: 'confirmed' } : prev
        )
      }
    },
    [updateEnrollmentStatus]
  )

  const handleCancelEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      const updated = await updateEnrollmentStatus(enrollment.id, 'rejected')
      if (updated) {
        // Update the selected enrollment immediately with the new status
        setSelectedEnrollment(prev =>
          prev ? { ...prev, status: 'rejected' } : prev
        )
      }
    },
    [updateEnrollmentStatus]
  )

  const handleSetPendingEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      const updated = await updateEnrollmentStatus(enrollment.id, 'pending')
      if (updated) {
        // Update the selected enrollment immediately with the new status
        setSelectedEnrollment(prev =>
          prev ? { ...prev, status: 'pending' } : prev
        )
      }
    },
    [updateEnrollmentStatus]
  )

  // Update selectedEnrollment when enrollments data changes
  React.useEffect(() => {
    if (selectedEnrollment && enrollments.length > 0) {
      const updatedEnrollment = enrollments.find(
        e => e.id === selectedEnrollment.id
      )
      if (updatedEnrollment) {
        setSelectedEnrollment(updatedEnrollment)
      }
    }
  }, [enrollments, selectedEnrollment])

  const handleRowClick = React.useCallback((enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setIsSheetOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<Enrollment>[]>(
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
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Candidato" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Enrollment['candidateName']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Candidato',
          placeholder: 'Buscar candidato...',
          variant: 'text',
          icon: User,
        },
        enableColumnFilter: true,
      },
      {
        id: 'cpf',
        accessorKey: 'cpf',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ cell }) => (
          <span className="font-mono text-sm">
            {cell.getValue<Enrollment['cpf']>()}
          </span>
        ),
        meta: {
          label: 'CPF',
          placeholder: 'Buscar CPF...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="E-mail" />
        ),
        cell: ({ cell }) => (
          <span className="text-sm text-muted-foreground">
            {cell.getValue<Enrollment['email']>()}
          </span>
        ),
      },
      {
        id: 'age',
        accessorKey: 'age',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Idade" />
        ),
        cell: ({ cell }) => {
          const age = cell.getValue<Enrollment['age']>()
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{age} anos</span>
            </div>
          )
        },
        meta: {
          label: 'Idade',
          variant: 'range',
          range: [18, 80],
          unit: 'anos',
          icon: Users,
        },
        enableColumnFilter: true,
      },
      {
        id: 'enrollmentDate',
        accessorKey: 'enrollmentDate',
        accessorFn: row => {
          const date = new Date(row.enrollmentDate)
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
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
        enableColumnFilter: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Enrollment['status']>()
          const statusConfig = {
            confirmed: {
              label: 'Confirmado',
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
          return Array.isArray(value) && value.includes(rowValue)
        },
        meta: {
          label: 'Status',
          variant: 'multiSelect',
          options: [
            { label: 'Confirmado', value: 'confirmed' },
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
    data: enrollments,
    columns,
    getRowId: row => row.id,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: apiPagination?.totalPages || 0,
  })

  const handleBulkConfirmEnrollments = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const enrollmentsToConfirm = selectedRows
      .map(row => row.original)
      .filter(enrollment => enrollment.status !== 'confirmed')

    if (enrollmentsToConfirm.length === 0) {
      return
    }

    // Use bulk update API
    const enrollmentIds = enrollmentsToConfirm.map(e => e.id)
    await updateMultipleEnrollmentStatuses(enrollmentIds, 'confirmed')

    // Clear selection after successful update
    table.resetRowSelection()
  }, [table, updateMultipleEnrollmentStatuses])

  const handleBulkSetPending = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const enrollmentsToSetPending = selectedRows
      .map(row => row.original)
      .filter(enrollment => enrollment.status !== 'pending')

    if (enrollmentsToSetPending.length === 0) {
      return
    }

    // Use bulk update API
    const enrollmentIds = enrollmentsToSetPending.map(e => e.id)
    await updateMultipleEnrollmentStatuses(enrollmentIds, 'pending')

    // Clear selection after successful update
    table.resetRowSelection()
  }, [table, updateMultipleEnrollmentStatuses])

  const handleDownloadSpreadsheet = React.useCallback(() => {
    // Always export all enrollments, not just selected ones
    const enrollmentsToExport = enrollments

    if (enrollmentsToExport.length === 0) {
      return
    }

    // Create CSV content
    const csvContent = [
      [
        'Nome',
        'CPF',
        'E-mail',
        'Idade',
        'Telefone',
        'Data de Inscrição',
        'Status',
        'Observações',
      ],
      ...enrollmentsToExport.map(enrollment => [
        enrollment.candidateName,
        enrollment.cpf,
        enrollment.email,
        enrollment.age.toString(),
        enrollment.phone || '',
        new Date(enrollment.enrollmentDate).toLocaleDateString('pt-BR'),
        enrollment.status,
        enrollment.notes || '',
      ]),
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)

    // Use course title if available, otherwise fallback to course ID
    const fileName = courseTitle
      ? `inscricoes_curso_${courseTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}`
      : `inscricoes_curso_${courseId}`

    link.setAttribute('download', `${fileName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [enrollments, courseId, courseTitle])

  const handleBulkCancelEnrollments = React.useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const enrollmentsToCancel = selectedRows
      .map(row => row.original)
      .filter(enrollment => enrollment.status !== 'rejected')

    if (enrollmentsToCancel.length === 0) {
      return
    }

    // Use bulk update API
    const enrollmentIds = enrollmentsToCancel.map(e => e.id)
    await updateMultipleEnrollmentStatuses(enrollmentIds, 'rejected')

    // Clear selection after successful update
    table.resetRowSelection()
  }, [table, updateMultipleEnrollmentStatuses])

  // Show loading state
  if (loading && enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Inscrições no Curso
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando inscrições...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Inscrições no Curso
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar inscrições
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
        <h2 className="text-2xl font-semibold tracking-tight">
          Inscrições no Curso
        </h2>
        <Button variant="outline" onClick={handleDownloadSpreadsheet}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {summary.totalVacancies}
              </p>
              <p className="text-sm text-blue-600">Total de Vagas</p>
            </div>
          </div> */}

          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.confirmedCount}
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
                {summary.cancelledCount}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>

          {/* <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {summary.remainingVacancies}
              </p>
              <p className="text-sm text-gray-600">Vagas Restantes</p>
            </div>
          </div> */}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Inscrição</SheetTitle>
            <SheetDescription>
              Informações completas do candidato
            </SheetDescription>
          </SheetHeader>
          {selectedEnrollment && (
            <>
              <div className="flex-1 overflow-y-auto py-6 px-4">
                <div className="space-y-6">
                  {/* Candidate Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-lg">
                        <User className="w-6 h-6 bg-background-light" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedEnrollment.candidateName}
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
                          <p className="font-mono">{selectedEnrollment.cpf}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Idade
                          </Label>
                          <p>{selectedEnrollment.age} anos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            E-mail
                          </Label>
                          <p className="text-sm">{selectedEnrollment.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Telefone
                          </Label>
                          <p className="text-sm">{selectedEnrollment.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações da Inscrição
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
                              selectedEnrollment.enrollmentDate
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Status
                          </Label>
                          <div className="mt-1">
                            {(() => {
                              const statusConfig = {
                                confirmed: {
                                  label: 'Confirmado',
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
                                statusConfig[selectedEnrollment.status]
                              return (
                                <Badge className={config.className}>
                                  {config.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                      {selectedEnrollment.notes && (
                        <div className="flex items-start gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Observações
                            </Label>
                            <p className="text-sm mt-1">
                              {selectedEnrollment.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  onClick={() => handleConfirmEnrollment(selectedEnrollment)}
                  className="w-full sm:flex-1 bg-green-50 border border-green-200 text-green-700"
                  disabled={selectedEnrollment.status === 'confirmed'}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar inscrição
                </Button>
                <Button
                  onClick={() => handleSetPendingEnrollment(selectedEnrollment)}
                  className="w-full sm:flex-1 bg-yellow-50 border border-yellow-200 text-yellow-700"
                  disabled={selectedEnrollment.status === 'pending'}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Deixar pendente
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelEnrollment(selectedEnrollment)}
                  className="w-full sm:flex-1 bg-red-50! border border-red-200 text-red-700"
                  disabled={selectedEnrollment.status === 'rejected'}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Recusar inscrição
                </Button>
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
            tooltip="Confirmar todas as inscrições selecionadas"
            onClick={handleBulkConfirmEnrollments}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar todas as inscrições
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir todas as inscrições selecionadas como pendentes"
            onClick={handleBulkSetPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendentes
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Exportar inscrições selecionadas para CSV"
            onClick={handleDownloadSpreadsheet}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar CSV
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Recusar inscrições selecionadas"
            onClick={handleBulkCancelEnrollments}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Recusar inscrições
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>
    </div>
  )
}
