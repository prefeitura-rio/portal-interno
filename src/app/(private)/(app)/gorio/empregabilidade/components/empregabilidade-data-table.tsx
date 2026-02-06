'use client'

/**
 * ============================================================================
 * COMPONENT: EmpregabilidadeDataTable
 * ============================================================================
 *
 * FEATURES:
 * - Persistent search across tabs (stored in URL param 'search')
 * - Server-side pagination and filtering via useEmpregabilidadeVagas hook
 * - Opens vagas in new tab on row click (window.open with '_blank')
 * - Multi-tab view: active, expired, awaiting_approval, draft
 *
 * SEARCH PERSISTENCE PATTERN (matching ServicesDataTable):
 * 1. URL 'search' param is source of truth
 * 2. columnFilters synced with URL via React effects
 * 3. Debounced updates prevent overload:
 *    - API call: 200ms (debouncedSearch)
 *    - URL update: 500ms (debouncedUrlUpdate)
 * 4. isUpdatingUrlRef prevents race conditions during typing
 * 5. Router.replace (not push) avoids polluting browser history
 *
 * DATA FLOW:
 * User types → columnFilters change → Effect triggers →
 * → debouncedSearch (200ms) → setSearchQuery → API call
 * → debouncedUrlUpdate (500ms) → router.replace → URL updated
 *
 * Browser back/forward → URL changes → Effect triggers →
 * → setColumnFilters → columnFilters updated → debouncedSearch → API call
 *
 * DEPENDENCIES:
 * - useEmpregabilidadeVagas: API calls with server-side filtering
 * - useSearchParams: Next.js URL state management
 * - useDebouncedCallback: Custom debounce hook
 * - useHeimdallUserContext: RBAC (canEditGoRio permission)
 *
 * REFERENCE IMPLEMENTATION:
 * - src/app/(private)/(app)/servicos-municipais/components/services-data-table.tsx
 * - Lines 162-430: Complete search persistence pattern
 */

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
  type VagaStatus,
  vagaStatusConfig,
} from '@/lib/status-config/empregabilidade'
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
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

/**
 * Maximum length for search input
 * Prevents URL from becoming too long (HTTP spec limits URLs to ~2000 chars)
 */
const MAX_SEARCH_LENGTH = 200

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
  /**
   * Initialize filters from URL on mount
   * Pattern: URL params are source of truth for persistent search
   */
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => {
      const searchFromUrl = searchParams.get('search') || ''
      if (searchFromUrl) {
        return [{ id: 'title', value: searchFromUrl }]
      }
      return []
    }
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

  /**
   * Ref to track if we're updating URL from local state
   * Prevents URL→State sync from overwriting during typing
   * See: services-data-table.tsx pattern
   */
  const isUpdatingUrlRef = React.useRef(false)

  // Fetch vagas using the hook
  const { vagas, loading, error, total, pageCount, refetch } =
    useEmpregabilidadeVagas({
      page: pagination.pageIndex + 1, // Convert 0-based to 1-based
      pageSize: pagination.pageSize,
      status: mapTabToStatus(activeTab),
      companyId: selectedCompany || undefined,
      titulo: searchQuery || undefined,
    })

  /**
   * Debounced search with max length enforcement
   * Truncates silently to MAX_SEARCH_LENGTH (better UX than error toast)
   */
  const debouncedSearch = useDebouncedCallback((query: string) => {
    // Truncate silently - better UX than error toast during typing
    const truncatedQuery = query.substring(0, MAX_SEARCH_LENGTH)
    setSearchQuery(truncatedQuery)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, 300)

  /**
   * Debounced URL update (500ms to avoid polluting browser history)
   *
   * Pattern from services-data-table.tsx:
   * - Uses router.replace (not push) to avoid creating history entry per keystroke
   * - Sets isUpdatingUrlRef flag to prevent URL→State sync from overwriting
   * - 500ms delay (vs 200ms for API) reduces URL churn
   */
  const debouncedUrlUpdate = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }

    // Set flag to prevent URL→State sync from overwriting our local state
    isUpdatingUrlRef.current = true

    // Use replace to avoid creating history entries per keystroke
    router.replace(`/gorio/empregabilidade?${params.toString()}`, {
      scroll: false,
    })

    // Clear flag after a tick to allow future browser navigation to work
    setTimeout(() => {
      isUpdatingUrlRef.current = false
    }, 100)
  }, 500)

  /**
   * Sync State → URL and State → API
   *
   * Triggers when columnFilters changes (user types in search input)
   * Debounces both API call (200ms) and URL update (500ms)
   */
  React.useEffect(() => {
    const titleFilter = columnFilters.find(filter => filter.id === 'title')
    const newSearchQuery = (titleFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      debouncedSearch(newSearchQuery)
      debouncedUrlUpdate(newSearchQuery)
    }
  }, [columnFilters, searchQuery, debouncedSearch, debouncedUrlUpdate])

  /**
   * Sync URL → State (handles browser back/forward navigation)
   *
   * CRITICAL: Only runs on URL changes from browser navigation,
   * NOT from our own router.replace() calls during typing
   *
   * Pattern from services-data-table.tsx:
   * - isUpdatingUrlRef prevents race condition where typing gets overwritten
   * - Only updates if URL differs from current state (avoid infinite loop)
   * - columnFilters NOT in deps array (would cause infinite loop)
   */
  React.useEffect(() => {
    // Skip if we're in the middle of updating URL from local state
    if (isUpdatingUrlRef.current) {
      return
    }

    const urlSearch = searchParams.get('search') || ''

    // Find current title filter in columnFilters
    const currentTitleFilter = columnFilters.find(f => f.id === 'title')
    const currentSearch = (currentTitleFilter?.value as string) || ''

    // Only update if URL differs from current state (avoid infinite loop)
    if (urlSearch !== currentSearch) {
      if (urlSearch) {
        // Add or update title filter
        setColumnFilters(prev => [
          ...prev.filter(f => f.id !== 'title'),
          { id: 'title', value: urlSearch },
        ])
      } else {
        // Remove title filter
        setColumnFilters(prev => prev.filter(f => f.id !== 'title'))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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

  // Row click handler removed - now inline in DataTable components below

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
            return (
              <span className="text-muted-foreground">Sem data limite</span>
            )

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
    manualSorting: true, // Use server-side sorting (backend already orders by created_at DESC)
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
          <DataTable
            table={table}
            loading={loading}
            onRowClick={(vaga: EmpregabilidadeVaga) => {
              if (vaga.id) {
                window.open(`/gorio/empregabilidade/${vaga.id}`, '_blank')
              }
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <DataTable
            table={table}
            loading={loading}
            onRowClick={(vaga: EmpregabilidadeVaga) => {
              if (vaga.id) {
                window.open(`/gorio/empregabilidade/${vaga.id}`, '_blank')
              }
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="awaiting_approval" className="space-y-4">
          <DataTable
            table={table}
            loading={loading}
            onRowClick={(vaga: EmpregabilidadeVaga) => {
              if (vaga.id) {
                window.open(`/gorio/empregabilidade/${vaga.id}`, '_blank')
              }
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <DataTable
            table={table}
            loading={loading}
            onRowClick={(vaga: EmpregabilidadeVaga) => {
              if (vaga.id) {
                window.open(`/gorio/empregabilidade/${vaga.id}`, '_blank')
              }
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
  )
}
