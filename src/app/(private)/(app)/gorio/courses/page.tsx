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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import type {
  CourseListItem,
  CourseStatus,
  CourseStatusConfig,
} from '@/types/course'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  getCoreRowModel,
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
  FileText,
  Flag,
  Handshake,
  MoreHorizontal,
  Play,
  Text,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

// Status configuration for badges
const statusConfig: Record<CourseStatus, CourseStatusConfig> = {
  draft: {
    icon: FileText,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  opened: {
    icon: ClipboardList,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  ABERTO: {
    icon: ClipboardList,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  // New dynamic statuses for opened/ABERTO courses
  scheduled: {
    icon: Calendar,
    label: 'Agendado',
    variant: 'outline',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  accepting_enrollments: {
    icon: UserCheck,
    label: 'Recebendo Inscrições',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  in_progress: {
    icon: Play,
    label: 'Em Andamento',
    variant: 'default',
    className: 'text-orange-600 border-orange-200 bg-orange-50',
  },
  finished: {
    icon: Flag,
    label: 'Encerrado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  closed: {
    icon: Flag,
    label: 'Fechado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  canceled: {
    icon: Ban,
    label: 'Cancelado',
    variant: 'secondary',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
  CRIADO: {
    icon: ClipboardList,
    label: 'Criado',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  ENCERRADO: {
    icon: Flag,
    label: 'Encerrado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
}

export default function Courses() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Get active tab from search params, default to 'created'
  const activeTab = searchParams.get('tab') || 'created'
  const [courses, setCourses] = React.useState<CourseListItem[]>([])
  const [draftCourses, setDraftCourses] = React.useState<CourseListItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Add state for total counts and pagination info
  const [coursesTotal, setCoursesTotal] = React.useState(0)
  const [draftCoursesTotal, setDraftCoursesTotal] = React.useState(0)
  const [coursesPageCount, setCoursesPageCount] = React.useState(0)
  const [draftCoursesPageCount, setDraftCoursesPageCount] = React.useState(0)

  // Fetch courses data with pagination
  const fetchCourses = React.useCallback(
    async (pageIndex = 0, pageSize = 10, tab = activeTab, searchQuery = '') => {
      try {
        setLoading(true)
        console.log(
          `Fetching ${tab} courses: page ${pageIndex + 1}, size ${pageSize}, search: "${searchQuery}"`
        )

        if (tab === 'draft') {
          // Build URL with search parameter for drafts
          const url = new URL('/api/courses/drafts', window.location.origin)
          url.searchParams.set('page', (pageIndex + 1).toString())
          url.searchParams.set('per_page', pageSize.toString())
          if (searchQuery.trim()) {
            url.searchParams.set('search', searchQuery.trim())
          }

          const response = await fetch(url.toString())
          if (response.ok) {
            const data = await response.json()
            console.log('Drafts API response:', data)
            setDraftCourses(data.courses || [])
            setDraftCoursesTotal(data.total || data.pagination?.total || 0)
            setDraftCoursesPageCount(
              Math.ceil((data.total || data.pagination?.total || 0) / pageSize)
            )
          }
        } else {
          // Build URL with search parameter for regular courses
          const url = new URL('/api/courses', window.location.origin)
          url.searchParams.set('page', (pageIndex + 1).toString())
          url.searchParams.set('per_page', pageSize.toString())
          if (searchQuery.trim()) {
            url.searchParams.set('search', searchQuery.trim())
          }

          const response = await fetch(url.toString())
          if (response.ok) {
            const data = await response.json()
            console.log('Courses API response:', data)
            setCourses(data.courses || [])
            setCoursesTotal(data.total || data.pagination?.total || 0)
            setCoursesPageCount(
              Math.ceil((data.total || data.pagination?.total || 0) / pageSize)
            )
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
        toast.error('Erro ao carregar cursos')
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [activeTab]
  )

  // Debounced search function to prevent too many API calls
  const debouncedFetchCourses = useDebouncedCallback((searchQuery: string) => {
    fetchCourses(0, pagination.pageSize, activeTab, searchQuery)
  }, 200)

  // Initial fetch when component mounts or tab changes
  React.useEffect(() => {
    if (!searchQuery) {
      fetchCourses(
        pagination.pageIndex,
        pagination.pageSize,
        activeTab,
        searchQuery
      )
    }
  }, [
    fetchCourses,
    pagination.pageIndex,
    pagination.pageSize,
    activeTab,
    searchQuery,
  ])

  // Handle search filter changes
  React.useEffect(() => {
    const titleFilter = columnFilters.find(filter => filter.id === 'title')
    const newSearchQuery = (titleFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      setSearchQuery(newSearchQuery)
      // Reset to first page when searching
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      // Use debounced search to prevent losing focus
      debouncedFetchCourses(newSearchQuery)
    }
  }, [columnFilters, searchQuery, debouncedFetchCourses])

  // Handle pagination changes
  const handlePaginationChange = React.useCallback(
    (
      updater: PaginationState | ((prev: PaginationState) => PaginationState)
    ) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater
      console.log('Pagination changed:', newPagination)
      setPagination(newPagination)

      // Fetch new data when pagination changes
      fetchCourses(
        newPagination.pageIndex,
        newPagination.pageSize,
        activeTab,
        searchQuery
      )
    },
    [pagination, fetchCourses, activeTab, searchQuery]
  )

  // Handle tab changes
  const handleTabChange = React.useCallback(
    (value: string) => {
      // Update URL with tab parameter
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', value)
      router.push(`/gorio/courses?${params.toString()}`)

      // Reset to first page when changing tabs
      const newPagination = { pageIndex: 0, pageSize: pagination.pageSize }
      setPagination(newPagination)

      // Note: fetchCourses will be called automatically by the useEffect
      // that monitors activeTab changes, so we don't need to call it here
    },
    [router, searchParams, pagination.pageSize]
  )

  // Filter data based on active tab
  const filteredData = React.useMemo(() => {
    if (activeTab === 'draft') {
      return draftCourses
    }
    return courses
  }, [activeTab, courses, draftCourses])

  // Get total count and page count based on active tab
  const totalCount = React.useMemo(() => {
    return activeTab === 'draft' ? draftCoursesTotal : coursesTotal
  }, [activeTab, draftCoursesTotal, coursesTotal])

  const pageCount = React.useMemo(() => {
    return activeTab === 'draft' ? draftCoursesPageCount : coursesPageCount
  }, [activeTab, draftCoursesPageCount, coursesPageCount])

  // Common columns without selection and status
  const baseColumns = React.useMemo<ColumnDef<CourseListItem>[]>(() => {
    // Handle course actions
    const handleCancelCourse = (course: CourseListItem) => {
      // TODO: Implement cancel course logic
      console.log('Cancelling course:', course.id)
      toast.success('Curso cancelado com sucesso!')
    }

    const handleDeleteDraft = (course: CourseListItem) => {
      // TODO: Implement delete draft logic
      console.log('Deleting draft:', course.id)
      toast.success('Rascunho excluído com sucesso!')
    }

    const openConfirmDialog = (
      type: 'cancel_course' | 'delete_draft',
      course: CourseListItem
    ) => {
      setConfirmDialog({
        open: true,
        type,
        course,
      })
    }

    return [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título do curso" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
              {cell.getValue<CourseListItem['title']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Título do curso',
          placeholder: 'Buscar curso por título...',
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
        cell: ({ cell, row }) => {
          const isExternalPartner = row.original.is_external_partner
          const provider = cell.getValue<CourseListItem['provider']>()
          const externalPartnerName = row.original.external_partner_name
          
          // Use external partner name if it's a partnership and the name exists
          const displayName = isExternalPartner && externalPartnerName ? externalPartnerName : provider
          
          return (
            <div className="flex items-center gap-2">
              {isExternalPartner ? (
                <Handshake className="h-4 w-4 text-blue-200" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex items-center gap-2 max-w-[300px] truncate">
                {isExternalPartner && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 border-blue-200"
                  >
                    Parceria
                  </Badge>
                )}
                <span className="max-w-[300px] truncate">{displayName}</span>
              </div>
            </div>
          )
        },
        meta: {
          label: 'Quem oferece',
          placeholder: 'Buscar ofertante...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: false,
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
          <DataTableColumnHeader column={column} title="Data de criação" />
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
          label: 'Data de criação',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'registration_start',
        accessorKey: 'registration_start',
        accessorFn: row => {
          const date = row.registration_start
          if (!date) return null
          const dateObj = new Date(date)
          dateObj.setHours(0, 0, 0, 0)
          return dateObj.getTime()
        },
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader
            column={column}
            title="Início das inscrições"
          />
        ),
        cell: ({ cell }) => {
          const timestamp = cell.getValue<number | null>()
          if (!timestamp)
            return <span className="text-muted-foreground">Não definido</span>

          const date = new Date(timestamp)
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        meta: {
          label: 'Início das inscrições',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'registration_end',
        accessorKey: 'registration_end',
        accessorFn: row => {
          const date = row.registration_end
          if (!date) return null
          const dateObj = new Date(date)
          dateObj.setHours(0, 0, 0, 0)
          return dateObj.getTime()
        },
        header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Fim das inscrições" />
        ),
        cell: ({ cell }) => {
          const timestamp = cell.getValue<number | null>()
          if (!timestamp)
            return <span className="text-muted-foreground">Não definido</span>

          const date = new Date(timestamp)
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        meta: {
          label: 'Fim das inscrições',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      // {
      //   id: 'vacancies',
      //   accessorKey: 'vacancies',
      //   accessorFn: row => Number(row.vacancies),
      //   header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
      //     <DataTableColumnHeader column={column} title="Vagas" />
      //   ),
      //   cell: ({ cell }) => {
      //     const vacancies = cell.getValue<CourseListItem['vacancies']>()
      //     return (
      //       <div className="flex items-center gap-2">
      //         <Users className="h-4 w-4 text-muted-foreground" />
      //         <span>{vacancies}</span>
      //       </div>
      //     )
      //   },
      //   meta: {
      //     label: 'Vagas',
      //     variant: 'range',
      //     range: [5, 50],
      //     unit: 'vagas',
      //     icon: Users,
      //   },
      //   enableColumnFilter: true,
      // },
      // {
      //   id: 'duration',
      //   accessorKey: 'duration',
      //   header: ({ column }: { column: Column<CourseListItem, unknown> }) => (
      //     <DataTableColumnHeader column={column} title="Duração" />
      //   ),
      //   cell: ({ cell }) => {
      //     const duration = cell.getValue<CourseListItem['duration']>()
      //     return (
      //       <div className="flex items-center gap-2">
      //         <Clock className="h-4 w-4 text-muted-foreground" />
      //         <span>{duration}h</span>
      //       </div>
      //     )
      //   },
      //   meta: {
      //     label: 'Duração',
      //     variant: 'range',
      //     range: [2, 50],
      //     unit: 'h',
      //     icon: Clock,
      //   },
      //   enableColumnFilter: true,
      // },
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
                {/* {course.status === 'draft' && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => openConfirmDialog('delete_draft', course)}
                  >
                    Excluir rascunho
                  </DropdownMenuItem>
                )} */}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 32,
      },
    ]
  }, [])

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
    }

    // For created courses tab, include status column before actions
    return [
      ...baseColumns.slice(0, -1),
      statusColumn,
      baseColumns[baseColumns.length - 1],
    ]
  }, [activeTab, baseColumns])

  // Dialog states
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    type: 'cancel_course' | 'delete_draft' | null
    course: CourseListItem | null
  }>({
    open: false,
    type: null,
    course: null,
  })

  const table = useReactTable({
    data: filteredData,
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
    // Remove client-side filtering since we're doing server-side filtering
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Add manual pagination and filtering configuration
    manualPagination: true,
    manualFiltering: true,
    pageCount: pageCount,
    rowCount: totalCount,
  })

  if (initialLoading) {
    return (
      <ContentLayout title="Gestão de Cursos">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando cursos...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

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
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="created">Cursos Criados</TabsTrigger>
            <TabsTrigger value="draft">Rascunho</TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="space-y-4">
            <DataTable
              table={table}
              loading={loading}
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
              loading={loading}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title={
          confirmDialog.type === 'cancel_course'
            ? 'Cancelar Curso'
            : 'Excluir Rascunho'
        }
        description={
          confirmDialog.type === 'cancel_course'
            ? `Tem certeza que deseja cancelar o curso "${confirmDialog.course?.title}"? Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir o rascunho "${confirmDialog.course?.title}"? Esta ação não pode ser desfeita.`
        }
        confirmText={
          confirmDialog.type === 'cancel_course'
            ? 'Cancelar Curso'
            : 'Excluir Rascunho'
        }
        variant="destructive"
        onConfirm={() => {
          if (confirmDialog.course) {
            if (confirmDialog.type === 'cancel_course') {
              // TODO: Implement cancel course logic
              console.log('Cancelling course:', confirmDialog.course.id)
              toast.success('Curso cancelado com sucesso!')
            } else if (confirmDialog.type === 'delete_draft') {
              // TODO: Implement delete draft logic
              console.log('Deleting draft:', confirmDialog.course.id)
              toast.success('Rascunho excluído com sucesso!')
            }
          }
        }}
      />
    </ContentLayout>
  )
}
