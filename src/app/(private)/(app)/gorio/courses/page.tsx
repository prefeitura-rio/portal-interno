'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { DataTable } from '@/components/data-table/data-table'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockCourseList } from '@/lib/mock-data'
import type {
  CourseListItem,
  CourseStatus,
  CourseStatusConfig,
} from '@/types/course'

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
  FileText,
  Flag,
  MoreHorizontal,
  Play,
  Text,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

// Status configuration for badges
const statusConfig: Record<CourseStatus, CourseStatusConfig> = {
  draft: {
    icon: FileText,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  scheduled: {
    icon: Calendar,
    label: 'Agendado',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  receiving_registrations: {
    icon: ClipboardList,
    label: 'Receb. insc.',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  in_progress: {
    icon: Play,
    label: 'Em andamento',
    variant: 'default',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  finished: {
    icon: Flag,
    label: 'Encerrado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  cancelled: {
    icon: Ban,
    label: 'Cancelado',
    variant: 'secondary',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
}

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
      return mockCourseList.filter(course => course.status === 'draft')
    }
    return mockCourseList.filter(course => course.status !== 'draft')
  }, [activeTab])

  // Common columns without selection and status
  const baseColumns = React.useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título do Curso" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<CourseListItem['title']>()}
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Quem oferece" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{cell.getValue<CourseListItem['provider']>()}</span>
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Vagas" />
        ),
        cell: ({ cell }) => {
          const vacancies = cell.getValue<CourseListItem['vacancies']>()
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
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Duração" />
        ),
        cell: ({ cell }) => {
          const duration = cell.getValue<CourseListItem['duration']>()
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
  const columns = React.useMemo<ColumnDef<CourseListItem>[]>(() => {
    if (activeTab === 'draft') {
      // For draft tab, return base columns without status
      return baseColumns
    }

    // Status column for created courses (without draft option)
    const statusColumn: ColumnDef<CourseListItem> = {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<CourseListItem['status']>()
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

    // For created courses tab, include status column before actions
    return [
      ...baseColumns.slice(0, -1),
      statusColumn,
      baseColumns[baseColumns.length - 1],
    ]
  }, [activeTab, baseColumns])

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
            </DataTable>
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
