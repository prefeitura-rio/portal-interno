'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { useMEIOpportunityOperations } from '@/hooks/use-mei-opportunity-operations'
import { useRouter, useSearchParams } from 'next/navigation'

// Types for MEI Opportunities
type OportunidadeMEIStatus = 'active' | 'expired' | 'draft'

type OportunidadeMEIStatusConfig = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: 'default' | 'outline' | 'secondary'
  className: string
}

type OportunidadeMEI = {
  id: string
  title: string
  activity: string
  offeredBy: string
  publishedAt: string | null
  expiresAt: string
  status: OportunidadeMEIStatus
  managingOrgan: string
  lastUpdate: string
  cnaeIds?: string[]
}

import { DepartmentName } from '@/components/ui/department-name'
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  type MEIOpportunityStatus,
  useMEIOpportunities,
} from '@/hooks/use-mei-opportunities'
import type { ModelsOportunidadeMEI } from '@/http-gorio/models'
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
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FileText,
  Info,
  MoreHorizontal,
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

// Status configuration for badges
const statusConfig: Record<OportunidadeMEIStatus, OportunidadeMEIStatusConfig> =
  {
    active: {
      icon: CheckCircle,
      label: 'Ativa',
      variant: 'default',
      className: 'text-green-600 border-green-200 bg-green-50',
    },
    expired: {
      icon: Clock,
      label: 'Expirada',
      variant: 'outline',
      className: 'text-red-600 border-red-200 bg-red-50',
    },
    draft: {
      icon: Edit,
      label: 'Rascunho',
      variant: 'secondary',
      className: 'text-blue-600 border-blue-200 bg-blue-50',
    },
  }

// Component to display CNAEs with tooltip
function CNAEActivityDisplay({ cnaeIds }: { cnaeIds: string[] }) {
  const [cnaesData, setCnaesData] = React.useState<
    Array<{ subclasse: string; denominacao: string }>
  >([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!cnaeIds || cnaeIds.length === 0) {
      setCnaesData([])
      return
    }

    const fetchCNAEs = async () => {
      setLoading(true)
      try {
        const promises = cnaeIds.map(async subclasse => {
          const params = new URLSearchParams({
            subclasse: subclasse.trim(),
            per_page: '1',
          })

          const response = await fetch(`/api/cnaes?${params.toString()}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.cnaes && result.cnaes.length > 0) {
              const cnae = result.cnaes[0]
              return {
                subclasse: cnae.subclasse || subclasse,
                denominacao: cnae.denominacao || subclasse,
              }
            }
          }
          return {
            subclasse,
            denominacao: subclasse,
          }
        })

        const results = await Promise.all(promises)
        setCnaesData(results)
      } catch (error) {
        console.error('Error fetching CNAEs:', error)
        // Fallback to showing just the subclasse codes
        setCnaesData(
          cnaeIds.map(subclasse => ({
            subclasse,
            denominacao: subclasse,
          }))
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCNAEs()
  }, [cnaeIds])

  if (loading) {
    return <span className="text-muted-foreground">Carregando...</span>
  }

  if (cnaesData.length === 0) {
    return <span className="text-muted-foreground">Sem CNAEs</span>
  }

  // Show tooltip for all cases (1 or more CNAEs)
  const first = cnaesData[0]
  const remaining = cnaesData.slice(1)
  const displayText =
    cnaesData.length === 1
      ? first.denominacao
      : `(+${remaining.length}) ${first.denominacao}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 max-w-[200px]">
          <span className="truncate">{displayText}</span>
          {/* {cnaesData.length > 1 && ( */}
          <Info className="h-3 w-3 text-muted-foreground shrink-0" />
          {/* )} */}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-md">
        <div className="space-y-0">
          <p className="font-semibold text-[13px] pb-2">Todos os CNAEs:</p>
          {cnaesData.map((cnae, index) => (
            <div key={index} className="space-y-0">
              <p className="text-xs font-medium">{cnae.subclasse}</p>
              <p className="text-xs text-background/60">{cnae.denominacao}</p>
              {index < cnaesData.length - 1 && <div className="h-2" />}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Helper function to transform API data to OportunidadeMEI format
function transformAPIToDataTable(
  opportunity: ModelsOportunidadeMEI
): OportunidadeMEI & { cnaeIds: string[] } {
  const opp = opportunity as any
  // Get cnae_ids from the API response
  const cnaeIds = opp.cnae_ids || []

  return {
    id: String(opp.id || ''),
    title: String(opp.titulo || ''),
    activity: '', // Will be populated by CNAEActivityDisplay component
    offeredBy: String(opp.orgao_id || ''), // Store orgao_id as cd_ua for DepartmentName
    publishedAt:
      opp.status === 'draft' ? null : opp.created_at?.split('T')?.[0] || null,
    expiresAt: String(opp.data_expiracao?.split('T')?.[0] || ''),
    status: opp.status as OportunidadeMEIStatus,
    managingOrgan: String(opp.orgao_id || ''), // Store orgao_id as cd_ua
    lastUpdate: String(opp.updated_at?.split('T')?.[0] || ''),
    cnaeIds, // Store cnae_ids for the component
  }
}

export function OportunidadesMEIDataTable() {
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

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    title: string
    description: string
    confirmText: string
    variant: 'default' | 'destructive'
    onConfirm: () => void
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'default',
    onConfirm: () => {},
  })

  // Get active tab from search params, default to 'active'
  const activeTab = (searchParams.get('tab') ||
    'active') as MEIOpportunityStatus
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSecretaria, setSelectedSecretaria] = React.useState('')

  // Fetch opportunities from API
  const { opportunities, loading, error, total, pageCount, refetch } =
    useMEIOpportunities({
      page: pagination.pageIndex + 1, // API pages start at 1
      pageSize: pagination.pageSize,
      status: activeTab,
      orgaoId: selectedSecretaria ? Number(selectedSecretaria) : undefined,
      titulo: searchQuery || undefined,
    })

  // Use operations hook for delete
  const { deleteOpportunity } = useMEIOpportunityOperations()

  // Transform API data to data table format
  const transformedOpportunities = React.useMemo(() => {
    return opportunities.map(transformAPIToDataTable)
  }, [opportunities])

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

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      toast.error('Erro ao carregar oportunidades', {
        description: error.message,
      })
    }
  }, [error])

  // Handle tab changes
  const handleTabChange = React.useCallback(
    (value: string) => {
      // Update URL with tab parameter
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', value)
      router.push(`/gorio/oportunidades-mei?${params.toString()}`)

      // Reset to first page when changing tabs
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    },
    [router, searchParams]
  )

  // Handle secretaria changes
  const handleSecretariaChange = React.useCallback((value: string) => {
    setSelectedSecretaria(value)
    // Reset to first page when changing secretaria
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Helper function to open confirmation dialog
  const openConfirmDialog = React.useCallback(
    (config: {
      title: string
      description: string
      confirmText: string
      variant?: 'default' | 'destructive'
      onConfirm: () => void
    }) => {
      setConfirmDialog({
        open: true,
        title: config.title,
        description: config.description,
        confirmText: config.confirmText,
        variant: config.variant || 'default',
        onConfirm: config.onConfirm,
      })
    },
    []
  )

  // Handle delete oportunidade
  const handleDeleteOportunidade = React.useCallback(
    (oportunidadeId: string, oportunidadeName: string) => {
      openConfirmDialog({
        title: 'Excluir Oportunidade MEI',
        description: `Tem certeza que deseja excluir a oportunidade "${oportunidadeName}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await deleteOpportunity(oportunidadeId)
            refetch() // Refresh the list
          } catch (error) {
            console.error('Error deleting opportunity:', error)
            // Error toast is already shown by the hook
          }
        },
      })
    },
    [openConfirmDialog, deleteOpportunity, refetch]
  )

  // Define table columns
  const columns = React.useMemo<ColumnDef<OportunidadeMEI>[]>(() => {
    return [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<OportunidadeMEI, unknown> }) => (
          <DataTableColumnHeader
            column={column}
            title="Título da oportunidade"
          />
        ),
        cell: ({ cell }) => (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="font-medium whitespace-normal break-words inline-block min-w-[200px]">
              {cell.getValue<OportunidadeMEI['title']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Título da oportunidade',
          placeholder: 'Buscar por oportunidade...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'activity',
        accessorKey: 'activity',
        header: ({ column }: { column: Column<OportunidadeMEI, unknown> }) => (
          <DataTableColumnHeader column={column} title="Atividade" />
        ),
        cell: ({ row }) => {
          const cnaeIds = row.original.cnaeIds || []
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CNAEActivityDisplay cnaeIds={cnaeIds} />
            </div>
          )
        },
        meta: {
          label: 'Atividade',
          placeholder: 'Buscar atividade...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: false,
      },
      {
        id: 'offeredBy',
        accessorKey: 'offeredBy',
        header: ({ column }: { column: Column<OportunidadeMEI, unknown> }) => (
          <DataTableColumnHeader column={column} title="Quem oferece" />
        ),
        cell: ({ cell }) => {
          const orgaoId = cell.getValue<OportunidadeMEI['offeredBy']>()
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">
                {orgaoId ? (
                  <DepartmentName cd_ua={orgaoId} />
                ) : (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </span>
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
        id: 'publishedAt',
        accessorKey: 'publishedAt',
        accessorFn: row => {
          if (!row.publishedAt) return null
          // Parse date as local date to avoid timezone issues
          const [year, month, day] = row.publishedAt.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          return date.getTime()
        },
        header: ({ column }: { column: Column<OportunidadeMEI, unknown> }) => (
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
        header: ({ column }: { column: Column<OportunidadeMEI, unknown> }) => {
          const getExpirationTitle = () => {
            switch (activeTab) {
              case 'active':
                return 'Expira em'
              case 'expired':
                return 'Expirada em'
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
        cell: function Cell({ row }) {
          const oportunidade = row.original

          // Check if user can edit this opportunity
          const canEditOportunidade = canEditGoRio

          return (
            <div className="flex items-center gap-2">
              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/gorio/oportunidades-mei/oportunidade-mei/${oportunidade.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Link>
                  </DropdownMenuItem>
                  {canEditOportunidade && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/gorio/oportunidades-mei/oportunidade-mei/${oportunidade.id}?edit=true`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteOportunidade(
                          oportunidade.id,
                          oportunidade.title
                        )
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        size: 32,
      },
    ]
  }, [isAdmin, canEditGoRio, activeTab, handleDeleteOportunidade])

  const table = useReactTable({
    data: transformedOpportunities,
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
    pageCount: pageCount, // Total number of pages from API
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col pb-4">
        <Label className="py-4">Filtrar por órgão/secretaria</Label>
        <DepartmentCombobox
          value={selectedSecretaria}
          onValueChange={handleSecretariaChange}
          placeholder="Todos os órgãos"
          className="md:w-auto h-14!"
          clearButtonSize="h-14! w-14!"
        />
      </div>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Oportunidades ativas</TabsTrigger>
          <TabsTrigger value="expired">Oportunidades expiradas</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || userRoleLoading}
            onRowClick={oportunidade => {
              window.open(
                `/gorio/oportunidades-mei/oportunidade-mei/${oportunidade.id}`,
                '_blank'
              )
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || userRoleLoading}
            onRowClick={oportunidade => {
              window.open(
                `/gorio/oportunidades-mei/oportunidade-mei/${oportunidade.id}`,
                '_blank'
              )
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || userRoleLoading}
            onRowClick={oportunidade => {
              window.open(
                `/gorio/oportunidades-mei/oportunidade-mei/${oportunidade.id}`,
                '_blank'
              )
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText="Cancelar"
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}
