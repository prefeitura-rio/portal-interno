'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Calendar as CalendarIcon,
  CheckCircle,
  MoreHorizontal,
  Text,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { NewCourseForm } from './new-course-form'

interface CourseTabsProps {
  course: any
  isEditing: boolean
  onSave: (data: any) => void
}

export function CourseTabs({ course, isEditing, onSave }: CourseTabsProps) {
  return (
    <Tabs defaultValue="sobre" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sobre">Sobre o curso</TabsTrigger>
        <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
      </TabsList>

      <TabsContent value="sobre" className="mt-6">
        <div className={isEditing ? '' : 'pointer-events-none opacity-90'}>
          <NewCourseForm
            initialData={course as any}
            isReadOnly={!isEditing}
            onSubmit={onSave}
          />
        </div>
      </TabsContent>

      <TabsContent value="inscricoes" className="mt-6">
        <CourseEnrollmentsTab />
      </TabsContent>
    </Tabs>
  )
}

interface Enrollment {
  id: string
  name: string
  cpf: string
  email: string
  age: number
  phone: string
  status: 'confirmed' | 'pending' | 'cancelled'
  enrollmentDate: string
  location: string
  occupation: string
}

function CourseEnrollmentsTab() {
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

  // Mock enrollment data
  const enrollments: Enrollment[] = [
    {
      id: '1',
      name: 'João Silva Santos',
      cpf: '123.456.789-00',
      email: 'joao.silva@email.com',
      age: 28,
      phone: '(11) 99999-9999',
      status: 'confirmed',
      enrollmentDate: '2025-08-15T10:00:00Z',
      location: 'Rua das Flores, 123 - Centro',
      occupation: 'Desenvolvedor Frontend',
    },
    {
      id: '2',
      name: 'Maria Santos Costa',
      cpf: '987.654.321-00',
      email: 'maria.santos@email.com',
      age: 32,
      phone: '(11) 88888-8888',
      status: 'pending',
      enrollmentDate: '2025-08-16T14:30:00Z',
      location: 'Av. Paulista, 1000 - Bela Vista',
      occupation: 'UX Designer',
    },
    {
      id: '3',
      name: 'Pedro Costa Oliveira',
      cpf: '456.789.123-00',
      email: 'pedro.costa@email.com',
      age: 25,
      phone: '(11) 77777-7777',
      status: 'confirmed',
      enrollmentDate: '2025-08-14T09:15:00Z',
      location: 'Rua Augusta, 500 - Consolação',
      occupation: 'Analista de Dados',
    },
    {
      id: '4',
      name: 'Ana Oliveira Lima',
      cpf: '789.123.456-00',
      email: 'ana.oliveira@email.com',
      age: 29,
      phone: '(11) 66666-6666',
      status: 'confirmed',
      enrollmentDate: '2025-08-17T16:45:00Z',
      location: 'Rua Oscar Freire, 200 - Jardins',
      occupation: 'Product Manager',
    },
    {
      id: '5',
      name: 'Carlos Lima Ferreira',
      cpf: '321.654.987-00',
      email: 'carlos.lima@email.com',
      age: 35,
      phone: '(11) 55555-5555',
      status: 'cancelled',
      enrollmentDate: '2025-08-13T11:20:00Z',
      location: 'Av. Brigadeiro Faria Lima, 1500 - Itaim Bibi',
      occupation: 'DevOps Engineer',
    },
    {
      id: '6',
      name: 'Fernanda Ferreira Silva',
      cpf: '654.321.987-00',
      email: 'fernanda.ferreira@email.com',
      age: 27,
      phone: '(11) 44444-4444',
      status: 'pending',
      enrollmentDate: '2025-08-18T13:10:00Z',
      location: 'Rua Haddock Lobo, 800 - Cerqueira César',
      occupation: 'Full Stack Developer',
    },
    {
      id: '7',
      name: 'Roberto Silva Mendes',
      cpf: '147.258.369-00',
      email: 'roberto.silva@email.com',
      age: 31,
      phone: '(11) 33333-3333',
      status: 'confirmed',
      enrollmentDate: '2025-08-12T08:30:00Z',
      location: 'Rua Pamplona, 300 - Jardins',
      occupation: 'Mobile Developer',
    },
    {
      id: '8',
      name: 'Juliana Mendes Costa',
      cpf: '258.369.147-00',
      email: 'juliana.mendes@email.com',
      age: 26,
      phone: '(11) 22222-2222',
      status: 'confirmed',
      enrollmentDate: '2025-08-19T15:45:00Z',
      location: 'Av. São João, 700 - República',
      occupation: 'QA Engineer',
    },
  ]

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
        id: 'name',
        accessorKey: 'name',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Nome do Inscrito" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Enrollment['name']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Nome do Inscrito',
          placeholder: 'Pesquisar por inscrito...',
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
          placeholder: 'Pesquisar por CPF...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
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
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{age} anos</span>
            </div>
          )
        },
        meta: {
          label: 'Idade',
          variant: 'range',
          range: [18, 70],
          unit: 'anos',
          icon: User,
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
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        meta: {
          label: 'Data de Inscrição',
          variant: 'dateRange',
          icon: CalendarIcon,
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
        id: 'phone',
        accessorKey: 'phone',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Telefone" />
        ),
        cell: ({ cell }) => (
          <span className="text-sm text-muted-foreground">
            {cell.getValue<Enrollment['phone']>()}
          </span>
        ),
      },
      {
        id: 'occupation',
        accessorKey: 'occupation',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Profissão" />
        ),
        cell: ({ cell }) => (
          <span className="text-sm">
            {cell.getValue<Enrollment['occupation']>()}
          </span>
        ),
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
              icon: CheckCircle,
              label: 'Confirmado',
              variant: 'default' as const,
              className: 'text-green-600 border-green-200 bg-green-50',
            },
            pending: {
              icon: AlertCircle,
              label: 'Pendente',
              variant: 'secondary' as const,
              className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
            },
            cancelled: {
              icon: XCircle,
              label: 'Cancelado',
              variant: 'destructive' as const,
              className: 'text-foreground border-red-200 bg-red-50',
            },
          }

          const config = statusConfig[status]
          const Icon = config.icon

          return (
            <Badge
              variant={config.variant}
              className={`capitalize ${config.className}`}
            >
              <Icon className="w-3 h-3 mr-1" />
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
            { label: 'Confirmado', value: 'confirmed', icon: CheckCircle },
            { label: 'Pendente', value: 'pending', icon: AlertCircle },
            { label: 'Cancelado', value: 'cancelled', icon: XCircle },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: 'actions',
        cell: function Cell({ row }) {
          const enrollment = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                <DropdownMenuItem>Editar inscrição</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Cancelar inscrição
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 32,
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
  })

  return (
    <div className="space-y-6">
      {/* Enrollment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo das Inscrições
          </CardTitle>
          <CardDescription>
            Visão geral das inscrições para este curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">25</p>
                <p className="text-sm text-blue-700">Total de vagas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900">5</p>
                <p className="text-sm text-green-700">Inscritos confirmados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <Users className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-900">2</p>
                <p className="text-sm text-yellow-700">Inscritos pendentes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">18</p>
                <p className="text-sm text-gray-700">Vagas disponíveis</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Inscritos</CardTitle>
          <CardDescription>
            Gerencie e visualize todos os inscritos neste curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable table={table}>
            <DataTableToolbar table={table} />
          </DataTable>
        </CardContent>
      </Card>
    </div>
  )
}
