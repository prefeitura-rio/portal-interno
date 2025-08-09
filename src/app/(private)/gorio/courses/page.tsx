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
  Ban,
  BookOpen,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Flag,
  MoreHorizontal,
  Play,
  Text,
  Trash2,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

interface Course {
  id: string
  title: string
  provider: string
  duration: number // in hours
  vacancies: number
  status:
    | 'draft'
    | 'scheduled'
    | 'receiving_registrations'
    | 'in_progress'
    | 'finished'
    | 'cancelled'
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
    status: 'receiving_registrations',
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
    status: 'in_progress',
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
    status: 'cancelled',
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
    status: 'finished',
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
    status: 'receiving_registrations',
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
    status: 'in_progress',
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
    status: 'finished',
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
    status: 'draft',
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
    status: 'scheduled',
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
    status: 'in_progress',
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
    status: 'finished',
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
    status: 'cancelled',
    created_at: '2024-01-15T10:00:00Z',
    registration_start: '2024-01-20T00:00:00Z',
    registration_end: '2024-02-20T23:59:59Z',
  },
  {
    id: '14',
    title: 'Inteligência Artificial Avançada',
    provider: 'AI Masters',
    duration: 90,
    vacancies: 15,
    status: 'scheduled',
    created_at: '2025-01-25T14:30:00Z',
    registration_start: '2025-02-01T00:00:00Z',
    registration_end: '2025-03-01T23:59:59Z',
  },
  {
    id: '15',
    title: 'Blockchain e Criptomoedas',
    provider: 'Crypto Academy',
    duration: 55,
    vacancies: 20,
    status: 'scheduled',
    created_at: '2025-01-28T09:15:00Z',
    registration_start: '2025-02-05T00:00:00Z',
    registration_end: '2025-03-05T23:59:59Z',
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
  const [activeTab, setActiveTab] = React.useState('created')

  // Filter data based on active tab
  const filteredData = React.useMemo(() => {
    if (activeTab === 'draft') {
      return data.filter(course => course.status === 'draft')
    }
    return data.filter(course => course.status !== 'draft')
  }, [activeTab])

  // Common columns (without status filter)
  const commonColumns = React.useMemo<ColumnDef<Course>[]>(
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
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Dt. de Criação" />
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
          label: 'Dt. de Criação',
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
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Início das Inscr." />
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
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Fim das Inscr." />
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

  // Create columns based on active tab
  const columns = React.useMemo<ColumnDef<Course>[]>(() => {
    if (activeTab === 'draft') {
      // For draft tab, don't include status column (no filter needed)
      return commonColumns
    }

    // Status column for created courses (without draft option)
    const statusColumn: ColumnDef<Course> = {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<Course, unknown> }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<Course['status']>()
        const statusConfig = {
          draft: {
            icon: FileText,
            label: 'Rascunho',
            variant: 'outline' as const,
            className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
          },
          scheduled: {
            icon: Calendar,
            label: 'Agendado',
            variant: 'outline' as const,
            className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
          },
          receiving_registrations: {
            icon: ClipboardList,
            label: 'Receb. insc.',
            variant: 'default' as const,
            className: 'text-green-600 border-green-200 bg-green-50',
          },
          in_progress: {
            icon: Play,
            label: 'Em andamento',
            variant: 'default' as const,
            className: 'text-blue-600 border-blue-200 bg-blue-50',
          },
          finished: {
            icon: Flag,
            label: 'Encerrado',
            variant: 'outline' as const,
            className: 'text-gray-500 border-gray-200 bg-gray-50',
          },
          cancelled: {
            icon: Ban,
            label: 'Cancelado',
            variant: 'secondary' as const,
            className: 'text-red-600 border-red-200 bg-red-50',
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
          { label: 'Agendado', value: 'scheduled', icon: Calendar },
          {
            label: 'Recebendo inscrições',
            value: 'receiving_registrations',
            icon: ClipboardList,
          },
          { label: 'Em andamento', value: 'in_progress', icon: Play },
          { label: 'Encerrado', value: 'finished', icon: Flag },
          { label: 'Cancelado', value: 'cancelled', icon: Ban },
        ],
      },
      enableColumnFilter: true,
    }

    // For created courses tab, include status column without draft option
    return [
      ...commonColumns.slice(0, -1),
      statusColumn,
      commonColumns[commonColumns.length - 1],
    ]
  }, [activeTab, commonColumns])

  const table = useReactTable({
    data: filteredData, // Use filtered data based on active tab
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="created">Cursos Criados</TabsTrigger>
            <TabsTrigger value="draft">Rascunho</TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="space-y-4">
            <DataTable
              table={table}
              onRowClick={course => {
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
                    const selectedRows =
                      table.getFilteredSelectedRowModel().rows
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
                    const selectedRows =
                      table.getFilteredSelectedRowModel().rows
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
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            <DataTable
              table={table}
              onRowClick={course => {
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
                    const selectedRows =
                      table.getFilteredSelectedRowModel().rows
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
                    const selectedRows =
                      table.getFilteredSelectedRowModel().rows
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
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
