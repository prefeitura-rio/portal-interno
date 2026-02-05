'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DepartmentName } from '@/components/ui/department-name'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useEmpregabilidadeVagas } from '@/hooks/use-empregabilidade-vagas'
import type { EmpregabilidadeVaga } from '@/http-gorio/models'
import {
  vagaStatusConfig,
  type VagaStatus,
} from '@/lib/status-config/empregabilidade'
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
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

// Types for Empregabilidade (Job Opportunities)
type VagaEmpregabilidadeStatus =
  | 'active'
  | 'expired'
  | 'awaiting_approval'
  | 'draft'

// Helper function to map tab to API status
const mapTabToStatus = (tab: VagaEmpregabilidadeStatus): VagaStatus => {
  const statusMap: Record<VagaEmpregabilidadeStatus, VagaStatus> = {
    active: 'publicado_ativo',
    expired: 'publicado_expirado',
    awaiting_approval: 'em_aprovacao',
    draft: 'em_edicao',
  }
  return statusMap[tab] || 'publicado_ativo'
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

  // Fetch vagas using the hook
  const { vagas, loading, error, total, pageCount, refetch } =
    useEmpregabilidadeVagas({
      page: pagination.pageIndex + 1, // Convert 0-based to 1-based
      pageSize: pagination.pageSize,
      status: mapTabToStatus(activeTab),
      companyId: selectedCompany || undefined,
      titulo: searchQuery || undefined,
    })

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

  // Handle row click - navigate to vaga details page
  const handleRowClick = React.useCallback(
    (vaga: EmpregabilidadeVaga) => {
      if (vaga.id) {
        router.push(`/gorio/empregabilidade/${vaga.id}`)
      }
    },
    [router]
  )

  // Handle delete action
  const handleDelete = React.useCallback(
    async (vagaId: string) => {
      // Confirm dialog
      if (
        !confirm(
          'Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.'
        )
      ) {
        return
      }

      try {
        const response = await fetch(`/api/empregabilidade/vagas/${vagaId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Falha ao excluir vaga')
        }

        toast.success('Vaga excluída com sucesso!')

        // Refetch data to update table
        refetch()
      } catch (error) {
        console.error('Error deleting vaga:', error)
        toast.error('Erro ao excluir vaga. Tente novamente.')
      }
    },
    [refetch]
  )

  // Define table columns
  const columns = React.useMemo<ColumnDef<EmpregabilidadeVaga>[]>(() => {
    return [
      {
        id: 'title',
        accessorKey: 'titulo',
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título da vaga" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
              {cell.getValue<string>()}
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
        accessorFn: row =>
          row.contratante?.nome_fantasia || row.id_contratante || '',
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => (
          <DataTableColumnHeader column={column} title="Empresa" />
        ),
        cell: ({ row }) => {
          const company =
            row.original.contratante?.nome_fantasia ||
            row.original.id_contratante
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
        accessorKey: 'id_orgao_parceiro',
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => (
          <DataTableColumnHeader column={column} title="Órgão responsável" />
        ),
        cell: ({ cell }) => {
          const organId = cell.getValue<string>()
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
        accessorKey: 'created_at',
        accessorFn: row => {
          if (!row.created_at) return null
          return new Date(row.created_at).getTime()
        },
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de criação" />
        ),
        cell: ({ cell }) => {
          const timestamp = cell.getValue<number | null>()
          if (!timestamp)
            return <span className="text-muted-foreground">Não informado</span>

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
        id: 'expiresAt',
        accessorKey: 'data_limite',
        accessorFn: row => {
          if (!row.data_limite) return null
          return new Date(row.data_limite).getTime()
        },
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => {
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
          const timestamp = cell.getValue<number | null>()
          if (!timestamp)
            return <span className="text-muted-foreground">Sem data limite</span>

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
        id: 'status',
        accessorKey: 'status',
        header: ({
          column,
        }: { column: Column<EmpregabilidadeVaga, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<string>() as VagaStatus
          const config = vagaStatusConfig[status]
          if (!config) return <span>{status}</span>

          const Icon = config.icon

          return (
            <Badge variant={config.variant} className={config.className}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        cell: function Cell({ row }) {
          const vaga = row.original
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
                  <Link href={`/gorio/empregabilidade/${vaga.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Link>
                </DropdownMenuItem>
                {canEditGoRio && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/gorio/empregabilidade/${vaga.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(vaga.id || '')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 32,
      },
    ]
  }, [activeTab, canEditGoRio, handleDelete])

  const table = useReactTable({
    data: vagas,
    columns,
    getRowId: row => row.id || '',
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
    pageCount: pageCount, // From hook
    rowCount: total, // From hook
  })

  // Show error if data fetch failed
  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4">
        <p className="text-sm text-destructive font-medium">
          Erro ao carregar vagas
        </p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
          Tentar novamente
        </Button>
      </div>
    )
  }

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
          <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="awaiting_approval" className="space-y-4">
          <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
  )
}
