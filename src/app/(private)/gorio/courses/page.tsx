'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { DataTable } from '@/components/data-table/data-table'
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from '@/components/data-table/data-table-action-bar'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  MoreHorizontal,
  Text,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

interface Course {
  id: string
  title: string
  provider: string
  duration: number // in hours
  vacancies: number
  status: 'active' | 'inactive' | 'draft' | 'completed'
  created_at: string
  registration_start: string
  registration_end: string
}

// Comprehensive mock data
const data: Course[] = [
  {
    id: '1',
    title: 'Desenvolvimento Web Frontend com React',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2025-07-30T10:00:00Z',
    registration_start: '2025-08-01T00:00:00Z',
    registration_end: '2025-08-31T23:59:59Z',
  },
  {
    id: '2',
    title: 'Python para Ciência de Dados',
    provider: 'DataScience Academy',
    duration: 60,
    vacancies: 15,
    status: 'active',
    created_at: '2025-02-10T14:30:00Z',
    registration_start: '2025-02-15T00:00:00Z',
    registration_end: '2025-03-15T23:59:59Z',
  },
  {
    id: '3',
    title: 'DevOps e Kubernetes',
    provider: 'Cloud Masters',
    duration: 80,
    vacancies: 10,
    status: 'inactive',
    created_at: '2025-06-05T09:15:00Z',
    registration_start: '2025-06-10T00:00:00Z',
    registration_end: '2025-07-10T23:59:59Z',
  },
  {
    id: '4',
    title: 'Mobile Development com React Native',
    provider: 'TechEducation',
    duration: 50,
    vacancies: 20,
    status: 'draft',
    created_at: '2025-06-20T16:45:00Z',
    registration_start: '2025-07-01T00:00:00Z',
    registration_end: '2025-07-31T23:59:59Z',
  },
  {
    id: '5',
    title: 'Machine Learning Fundamentals',
    provider: 'AI Institute',
    duration: 70,
    vacancies: 12,
    status: 'completed',
    created_at: '2025-07-30T11:00:00Z',
    registration_start: '2025-08-01T00:00:00Z',
    registration_end: '2025-08-31T23:59:59Z',
  },
  {
    id: '6',
    title: 'Advanced JavaScript and TypeScript',
    provider: 'JavaScript Academy',
    duration: 45,
    vacancies: 30,
    status: 'active',
    created_at: '2025-01-12T08:30:00Z',
    registration_start: '2025-01-15T00:00:00Z',
    registration_end: '2025-02-15T23:59:59Z',
  },
  {
    id: '7',
    title: 'Cybersecurity Essentials',
    provider: 'SecureLearn',
    duration: 35,
    vacancies: 18,
    status: 'active',
    created_at: '2025-01-18T13:20:00Z',
    registration_start: '2025-01-20T00:00:00Z',
    registration_end: '2025-02-20T23:59:59Z',
  },
  {
    id: '8',
    title: 'UX/UI Design Masterclass',
    provider: 'Design Hub',
    duration: 55,
    vacancies: 22,
    status: 'inactive',
    created_at: '2025-01-08T15:10:00Z',
    registration_start: '2025-01-10T00:00:00Z',
    registration_end: '2025-02-10T23:59:59Z',
  },
  {
    id: '9',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2025-01-15T10:00:00Z',
    registration_start: '2025-01-20T00:00:00Z',
    registration_end: '2025-02-20T23:59:59Z',
  },
  {
    id: '10',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2025-01-15T10:00:00Z',
    registration_start: '2025-01-20T00:00:00Z',
    registration_end: '2025-02-20T23:59:59Z',
  },
  {
    id: '11',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2025-01-15T10:00:00Z',
    registration_start: '2025-01-20T00:00:00Z',
    registration_end: '2025-02-20T23:59:59Z',
  },
  {
    id: '12',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    registration_start: '2024-01-20T00:00:00Z',
    registration_end: '2024-02-20T23:59:59Z',
  },
  {
    id: '13',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    registration_start: '2024-01-20T00:00:00Z',
    registration_end: '2024-02-20T23:59:59Z',
  },
]

export default function Courses() {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'created_at', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns = React.useMemo<ColumnDef<Course>[]>(
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
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título do Curso" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Course['title']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Título',
          placeholder: 'Buscar cursos...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'provider',
        accessorKey: 'provider',
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Quem oferece" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{cell.getValue<Course['provider']>()}</span>
          </div>
        ),
        meta: {
          label: 'Quem oferece',
          placeholder: 'Buscar ofertante...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: true,
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        accessorFn: row => {
          const date = new Date(row.created_at)
          // Normalize to start of day (midnight) for proper date filtering
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de Criação" />
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
          label: 'Data de Criação',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: true,
      },
      {
        id: 'registration_start',
        accessorKey: 'registration_start',
        accessorFn: row => {
          const date = new Date(row.registration_start)
          // Normalize to start of day (midnight) for proper date filtering
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader
            column={column}
            title="Início das Inscrições"
          />
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
          label: 'Início das Inscrições',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: true,
      },
      {
        id: 'registration_end',
        accessorKey: 'registration_end',
        accessorFn: row => {
          const date = new Date(row.registration_end)
          // Normalize to start of day (midnight) for proper date filtering
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Fim das Inscrições" />
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
          label: 'Fim das Inscrições',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: true,
      },

      {
        id: 'vacancies',
        accessorKey: 'vacancies',
        accessorFn: row => Number(row.vacancies),
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Vagas" />
        ),
        cell: ({ cell }) => {
          const vacancies = cell.getValue<Course['vacancies']>()
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{vacancies}</span>
            </div>
          )
        },
        meta: {
          label: 'Vagas',
          variant: 'range',
          range: [5, 50],
          unit: 'vagas',
          icon: Users,
        },
        enableColumnFilter: true,
      },
      {
        id: 'duration',
        accessorKey: 'duration',
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Duração" />
        ),
        cell: ({ cell }) => {
          const duration = cell.getValue<Course['duration']>()
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration}h</span>
            </div>
          )
        },
        meta: {
          label: 'Duração',
          variant: 'range',
          range: [2, 50],
          unit: 'h',
          icon: Clock,
        },
        enableColumnFilter: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Course['status']>()
          const statusConfig = {
            active: {
              icon: CheckCircle,
              label: 'Ativo',
              variant: 'default' as const,
              className: 'text-green-600 border-green-200 bg-green-50',
            },
            inactive: {
              icon: XCircle,
              label: 'Inativo',
              variant: 'secondary' as const,
              className: 'text-gray-600 border-gray-200 bg-gray-50',
            },
            draft: {
              icon: AlertCircle,
              label: 'Rascunho',
              variant: 'outline' as const,
              className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
            },
            completed: {
              icon: CheckCircle,
              label: 'Concluído',
              variant: 'outline' as const,
              className: 'text-blue-600 border-blue-200 bg-blue-50',
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
            { label: 'Ativo', value: 'active', icon: CheckCircle },
            { label: 'Inativo', value: 'inactive', icon: XCircle },
            { label: 'Rascunho', value: 'draft', icon: AlertCircle },
            { label: 'Concluído', value: 'completed', icon: CheckCircle },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: 'actions',
        cell: function Cell({ row }) {
          const course = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/gorio/courses/course/${course.id}`}>
                    Visualizar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/gorio/courses/course/${course.id}?edit=true`}>
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Excluir
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
    data: data, // Use the full mock data
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
    <ContentLayout title="Gestão de Cursos">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>GO Rio</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Cursos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Cursos</h2>
              <p className="text-muted-foreground">
                Gerencie e monitore todos os cursos disponíveis na plataforma.
              </p>
            </div>
            <Link href="/gorio/courses/new">
              <Button className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                Novo Curso
              </Button>
            </Link>
          </div>
        </div>

        <DataTable 
          table={table}
          onRowClick={(course) => {
            // Navigate to the course detail page
            window.location.href = `/gorio/courses/course/${course.id}`
          }}
        >
          <DataTableToolbar table={table} />

          <DataTableActionBar table={table}>
            <DataTableActionBarSelection table={table} />
            <DataTableActionBarAction
              tooltip="Baixar planilha(s) do(s) curso(s) selecionado(s)"
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows
                console.log(
                  'Baixando planilha:',
                  selectedRows.map(row => row.original)
                )
                // TODO: Implement download logic
              }}
            >
              <Download />
              Baixar planilha(s)
            </DataTableActionBarAction>
            <DataTableActionBarAction
              tooltip="Excluir cursos selecionados"
              variant="destructive"
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows
                console.log(
                  'Excluindo cursos:',
                  selectedRows.map(row => row.original)
                )
                // TODO: Implement deletion logic with confirmation
              }}
            >
              <Trash2 />
              Excluir
            </DataTableActionBarAction>
          </DataTableActionBar>
        </DataTable>
      </div>
    </ContentLayout>
  )
}
