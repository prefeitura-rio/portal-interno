'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Button } from '@/components/ui/button'
import { DepartmentName } from '@/components/ui/department-name'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
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
  Building2,
  Calendar,
  FileText,
  MoreHorizontal,
  Text,
} from 'lucide-react'
import * as React from 'react'

// Types for Empregabilidade (Job Opportunities)
type VagaEmpregabilidadeStatus =
  | 'active'
  | 'expired'
  | 'awaiting_approval'
  | 'draft'

type VagaEmpregabilidade = {
  id: string
  title: string
  company: string
  managingOrgan: string
  publishedAt: string | null
  expiresAt: string
  status: VagaEmpregabilidadeStatus
}

export function EmpregabilidadeDataTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    loading: userRoleLoading,
    isAdmin,
    canEditGoRio,
  } = useHeimdallUserContext()

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'expiresAt', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Get active tab from search params, default to 'active'
  const activeTab = (searchParams.get('tab') ||
    'active') as VagaEmpregabilidadeStatus
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCompany, setSelectedCompany] = React.useState('')

  // Mock data - will be replaced with real data later
  const data: VagaEmpregabilidade[] = React.useMemo(() => [], [])

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, 300)

  // Handle search filter changes
  React.useEffect(() => {
    const titleFilter = columnFilters.find(filter => filter.id === 'title')
    const newSearchQuery = (titleFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      debouncedSearch(newSearchQuery)
    }
  }, [columnFilters, searchQuery, debouncedSearch])

  // Handle tab changes
  const handleTabChange = React.useCallback(
    (value: string) => {
      // Update URL with tab parameter
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', value)
      router.push(`/gorio/empregabilidade?${params.toString()}`)

      // Reset to first page when changing tabs
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    },
    [router, searchParams]
  )

  // Handle company changes
  const handleCompanyChange = React.useCallback((value: string) => {
    setSelectedCompany(value)
    // Reset to first page when changing company
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Define table columns
  const columns = React.useMemo<ColumnDef<VagaEmpregabilidade>[]>(() => {
    return [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({
          column,
        }: { column: Column<VagaEmpregabilidade, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título da vaga" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
              {cell.getValue<VagaEmpregabilidade['title']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Título da vaga',
          placeholder: 'Buscar por título da vaga...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'company',
        accessorKey: 'company',
        header: ({
          column,
        }: { column: Column<VagaEmpregabilidade, unknown> }) => (
          <DataTableColumnHeader column={column} title="Empresa" />
        ),
        cell: ({ cell }) => {
          const company = cell.getValue<VagaEmpregabilidade['company']>()
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">
                {company || (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </span>
            </div>
          )
        },
        meta: {
          label: 'Empresa',
          placeholder: 'Buscar empresa...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: false,
      },
      {
        id: 'managingOrgan',
        accessorKey: 'managingOrgan',
        header: ({
          column,
        }: { column: Column<VagaEmpregabilidade, unknown> }) => (
          <DataTableColumnHeader column={column} title="Órgão responsável" />
        ),
        cell: ({ cell }) => {
          const organId = cell.getValue<VagaEmpregabilidade['managingOrgan']>()
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">
                {organId ? (
                  <DepartmentName cd_ua={organId} />
                ) : (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </span>
            </div>
          )
        },
        meta: {
          label: 'Órgão responsável',
          placeholder: 'Buscar órgão...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: false,
      },
      {
        id: 'publishedAt',
        accessorKey: 'publishedAt',
        accessorFn: row => {
          if (!row.publishedAt) return null
          // Parse date as local date to avoid timezone issues
          const [year, month, day] = row.publishedAt.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          return date.getTime()
        },
        header: ({
          column,
        }: { column: Column<VagaEmpregabilidade, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de publicação" />
        ),
        cell: ({ cell }) => {
          const timestamp = cell.getValue<number | null>()
          if (!timestamp)
            return <span className="text-muted-foreground">Não publicado</span>

          const date = new Date(timestamp)
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        meta: {
          label: 'Data de publicação',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'expiresAt',
        accessorKey: 'expiresAt',
        accessorFn: row => {
          // Parse date as local date to avoid timezone issues
          const [year, month, day] = row.expiresAt.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          return date.getTime()
        },
        header: ({
          column,
        }: { column: Column<VagaEmpregabilidade, unknown> }) => {
          const getExpirationTitle = () => {
            switch (activeTab) {
              case 'active':
                return 'Expira em'
              case 'expired':
                return 'Expirada em'
              case 'awaiting_approval':
              case 'draft':
                return 'Expira em'
              default:
                return 'Expira em'
            }
          }
          return (
            <DataTableColumnHeader
              column={column}
              title={getExpirationTitle()}
            />
          )
        },
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
          label: 'Expira em',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        cell: function Cell() {
          return (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </div>
          )
        },
        size: 32,
      },
    ]
  }, [activeTab])

  const table = useReactTable({
    data,
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Use server-side pagination
    manualFiltering: true, // Use server-side filtering
    pageCount: 0, // Will be set when data is fetched
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col pb-4">
        <Label className="py-4">Filtrar por empresa</Label>
        <Select
          value={selectedCompany || undefined}
          onValueChange={handleCompanyChange}
        >
          <SelectTrigger className="md:w-auto h-14!">
            <SelectValue placeholder="Todas as empresas" />
          </SelectTrigger>
          <SelectContent>
            {/* Add company options here when data is available */}
          </SelectContent>
        </Select>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Vagas ativas</TabsTrigger>
          <TabsTrigger value="expired">Vagas expiradas</TabsTrigger>
          <TabsTrigger value="awaiting_approval">
            Prontas para aprovação
          </TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <DataTable table={table} loading={userRoleLoading}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <DataTable table={table} loading={userRoleLoading}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="awaiting_approval" className="space-y-4">
          <DataTable table={table} loading={userRoleLoading}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <DataTable table={table} loading={userRoleLoading}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
  )
}
