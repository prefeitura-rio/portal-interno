'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  AlertCircle,
  Calendar,
  CheckCircle,
  Hash,
  Mail,
  Phone,
  Text,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import * as React from 'react'

interface Enrollment {
  id: string
  candidateName: string
  cpf: string
  email: string
  age: number
  phone: string
  enrollmentDate: string
  status: 'confirmed' | 'pending' | 'cancelled'
  courseId: string
}

// Mock enrollment data
const enrollmentData: Enrollment[] = [
  {
    id: '1',
    candidateName: 'João Silva',
    cpf: '123.456.789-00',
    email: 'joao.silva@email.com',
    age: 28,
    phone: '(11) 99999-9999',
    enrollmentDate: '2025-08-15T10:00:00Z',
    status: 'confirmed',
    courseId: '1',
  },
  {
    id: '2',
    candidateName: 'Maria Alves',
    cpf: '987.654.321-00',
    email: 'maria.alves@email.com',
    age: 32,
    phone: '(11) 88888-8888',
    enrollmentDate: '2025-08-18T14:30:00Z',
    status: 'pending',
    courseId: '1',
  },
  {
    id: '3',
    candidateName: 'Pedro Costa',
    cpf: '456.789.123-00',
    email: 'pedro.costa@email.com',
    age: 25,
    phone: '(11) 77777-7777',
    enrollmentDate: '2025-08-20T09:15:00Z',
    status: 'confirmed',
    courseId: '1',
  },
  {
    id: '4',
    candidateName: 'Ana Santos',
    cpf: '789.123.456-00',
    email: 'ana.santos@email.com',
    age: 29,
    phone: '(11) 66666-6666',
    enrollmentDate: '2025-08-22T16:45:00Z',
    status: 'pending',
    courseId: '1',
  },
  {
    id: '5',
    candidateName: 'Carlos Oliveira',
    cpf: '321.654.987-00',
    email: 'carlos.oliveira@email.com',
    age: 35,
    phone: '(11) 55555-5555',
    enrollmentDate: '2025-08-25T11:20:00Z',
    status: 'confirmed',
    courseId: '1',
  },
  {
    id: '6',
    candidateName: 'Fernanda Lima',
    cpf: '654.321.987-00',
    email: 'fernanda.lima@email.com',
    age: 27,
    phone: '(11) 44444-4444',
    enrollmentDate: '2025-08-28T13:10:00Z',
    status: 'cancelled',
    courseId: '1',
  },
  {
    id: '7',
    candidateName: 'Roberto Ferreira',
    cpf: '147.258.369-00',
    email: 'roberto.ferreira@email.com',
    age: 31,
    phone: '(11) 33333-3333',
    enrollmentDate: '2025-08-30T08:30:00Z',
    status: 'confirmed',
    courseId: '1',
  },
  {
    id: '8',
    candidateName: 'Juliana Martins',
    cpf: '258.369.147-00',
    email: 'juliana.martins@email.com',
    age: 26,
    phone: '(11) 22222-2222',
    enrollmentDate: '2025-09-01T15:45:00Z',
    status: 'pending',
    courseId: '1',
  },
]

export function EnrollmentsTable() {
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

  // Calculate summary statistics
  const confirmedCount = enrollmentData.filter(
    e => e.status === 'confirmed'
  ).length
  const pendingCount = enrollmentData.filter(e => e.status === 'pending').length
  const cancelledCount = enrollmentData.filter(
    e => e.status === 'cancelled'
  ).length
  const totalVacancies = 25 // This could come from course data
  const remainingVacancies = totalVacancies - confirmedCount

  const handleConfirmEnrollment = React.useCallback(
    (enrollment: Enrollment) => {
      // TODO: Implement confirmation logic
      console.log('Confirming enrollment:', enrollment.id)
    },
    []
  )

  const handleCancelEnrollment = React.useCallback((enrollment: Enrollment) => {
    // TODO: Implement cancellation logic
    console.log('Cancelling enrollment:', enrollment.id)
  }, [])

  const handleRowClick = React.useCallback((enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setIsSheetOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<Enrollment>[]>(
    () => [
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
            },
            pending: {
              label: 'Pendente',
              variant: 'default' as const,
              className: 'bg-yellow-100 text-yellow-800',
            },
            cancelled: {
              label: 'Cancelado',
              variant: 'secondary' as const,
              className: 'text-red-600 border-red-200 bg-red-50',
            },
          }

          const config = statusConfig[status]

          return (
            <Badge variant={config.variant} className={config.className}>
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
          ],
        },
        enableColumnFilter: true,
      },
    ],
    []
  )

  const table = useReactTable({
    data: enrollmentData,
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
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Inscrições no Curso
        </h2>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Exportar Lista
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-700">{totalVacancies}</p>
            <p className="text-sm text-blue-600">Total de Vagas</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">
              {confirmedCount}
            </p>
            <p className="text-sm text-green-600">Confirmados</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
            <p className="text-sm text-yellow-600">Pendentes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{cancelledCount}</p>
            <p className="text-sm text-red-600">Cancelados</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">
              {remainingVacancies}
            </p>
            <p className="text-sm text-gray-600">Vagas Restantes</p>
          </div>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
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
                    </div>
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => handleConfirmEnrollment(selectedEnrollment)}
                  className="w-full sm:w-auto"
                  disabled={selectedEnrollment.status === 'confirmed'}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar inscrição
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelEnrollment(selectedEnrollment)}
                  className="w-full sm:w-auto"
                  disabled={selectedEnrollment.status === 'cancelled'}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar inscrição
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTable table={table} onRowClick={handleRowClick}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  )
}
