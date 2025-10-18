'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
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
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useServiceOperations } from '@/hooks/use-service-operations'
import { useServices } from '@/hooks/use-services'
import { getSecretariaByValue } from '@/lib/secretarias'
import type {
  ServiceListItem,
  ServiceStatus,
  ServiceStatusConfig,
} from '@/types/service'
import { useRouter, useSearchParams } from 'next/navigation'

import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { SECRETARIAS } from '@/lib/secretarias'
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
  MoreHorizontal,
  Play,
  Square,
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

// Status configuration for badges
const statusConfig: Record<ServiceStatus, ServiceStatusConfig> = {
  published: {
    icon: CheckCircle,
    label: 'Publicado',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  awaiting_approval: {
    icon: Clock,
    label: 'Aguardando aprovação',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  in_edition: {
    icon: Edit,
    label: 'Em edição',
    variant: 'secondary',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
}

export function ServicesDataTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const canEditServices = useCanEditBuscaServices()
  const {
    publishService,
    unpublishService,
    deleteService,
    loading: operationLoading,
  } = useServiceOperations()

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'last_update', desc: true },
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

  // Get active tab from search params, default to 'published'
  const activeTab = (searchParams.get('tab') || 'published') as ServiceStatus
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSecretaria, setSelectedSecretaria] = React.useState('')
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = React.useState(
    Date.now()
  )
  const [isRefreshingAfterOperation, setIsRefreshingAfterOperation] =
    React.useState(false)

  // Use the services hook to fetch data from API
  const {
    services,
    loading,
    error,
    pagination: apiPagination,
    refetch,
  } = useServices({
    page: pagination.pageIndex + 1, // API uses 1-based pagination
    perPage: pagination.pageSize,
    search: searchQuery,
    status: activeTab,
    managingOrgan: selectedSecretaria,
  })

  // Update pagination when API pagination changes
  React.useEffect(() => {
    if (apiPagination) {
      setPagination(prev => ({
        ...prev,
        pageIndex: apiPagination.page - 1, // Convert back to 0-based for UI
        pageSize: apiPagination.per_page,
      }))
    }
  }, [apiPagination])

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, 200)

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
      router.push(`/servicos-municipais/servicos?${params.toString()}`)

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

  // Handle quick actions
  const handlePublishService = React.useCallback(
    (serviceId: string, serviceName: string) => {
      openConfirmDialog({
        title: 'Publicar Serviço',
        description: `Tem certeza que deseja publicar o serviço "${serviceName}"? Ele ficará disponível para todos os cidadãos.`,
        confirmText: 'Publicar',
        variant: 'default',
        onConfirm: async () => {
          try {
            setIsRefreshingAfterOperation(true)
            console.log('🔄 Starting publish service operation...')
            await publishService(serviceId)
            // Add a small delay to ensure API changes are processed
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('🔄 Refetching services after publish...')
            setLastRefreshTimestamp(Date.now())
            await refetch()
            console.log('✅ Services list refreshed after publish')
          } catch (error) {
            console.error('❌ Error in publish service flow:', error)
          } finally {
            setIsRefreshingAfterOperation(false)
          }
        },
      })
    },
    [openConfirmDialog, publishService, refetch]
  )

  const handleUnpublishService = React.useCallback(
    (serviceId: string, serviceName: string) => {
      openConfirmDialog({
        title: 'Despublicar Serviço',
        description: `Tem certeza que deseja despublicar o serviço "${serviceName}"? Ele deixará de estar disponível para os cidadãos.`,
        confirmText: 'Despublicar',
        variant: 'default',
        onConfirm: async () => {
          try {
            setIsRefreshingAfterOperation(true)
            console.log('🔄 Starting unpublish service operation...')
            await unpublishService(serviceId)
            // Add a small delay to ensure API changes are processed
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('🔄 Refetching services after unpublish...')
            setLastRefreshTimestamp(Date.now())
            await refetch()
            console.log('✅ Services list refreshed after unpublish')
          } catch (error) {
            console.error('❌ Error in unpublish service flow:', error)
          } finally {
            setIsRefreshingAfterOperation(false)
          }
        },
      })
    },
    [openConfirmDialog, unpublishService, refetch]
  )

  const handleDeleteService = React.useCallback(
    (serviceId: string, serviceName: string) => {
      openConfirmDialog({
        title: 'Excluir Serviço',
        description: `Tem certeza que deseja excluir o serviço "${serviceName}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        variant: 'destructive',
        onConfirm: async () => {
          try {
            setIsRefreshingAfterOperation(true)
            console.log('🔄 Starting delete service operation...')
            await deleteService(serviceId)
            // Add a small delay to ensure API changes are processed
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('🔄 Refetching services after delete...')
            setLastRefreshTimestamp(Date.now())
            await refetch()
            console.log('✅ Services list refreshed after delete')
          } catch (error) {
            console.error('❌ Error in delete service flow:', error)
          } finally {
            setIsRefreshingAfterOperation(false)
          }
        },
      })
    },
    [openConfirmDialog, deleteService, refetch]
  )

  // Define table columns
  const columns = React.useMemo<ColumnDef<ServiceListItem>[]>(() => {
    return [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título do serviço" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
              {cell.getValue<ServiceListItem['title']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Título do serviço',
          placeholder: 'Buscar por serviço...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'managingOrgan',
        accessorKey: 'managingOrgan',
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Secretaria" />
        ),
        cell: ({ cell }) => {
          const managingOrganValue =
            cell.getValue<ServiceListItem['managingOrgan']>()
          const secretaria = getSecretariaByValue(managingOrganValue)
          const displayName = secretaria?.label || managingOrganValue

          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">{displayName}</span>
            </div>
          )
        },
        meta: {
          label: 'Secretaria',
          placeholder: 'Buscar secretaria...',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: false,
      },
      {
        id: 'published_at',
        accessorKey: 'published_at',
        accessorFn: row => {
          if (!row.published_at) return null
          const date = new Date(row.published_at)
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Publicado em" />
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
          label: 'Publicado em',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'last_update',
        accessorKey: 'last_update',
        accessorFn: row => {
          const date = new Date(row.last_update)
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Última modificação" />
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
          label: 'Última modificação',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<ServiceListItem['status']>()
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
        meta: {
          label: 'Status',
          variant: 'select',
          icon: CheckCircle,
        },
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        cell: function Cell({ row }) {
          const service = row.original

          // Helper function to check if user can edit the service
          const canEditService = () => {
            // Admins can always edit
            if (isBuscaServicesAdmin) {
              return true
            }

            // Editors can only edit services that are not published
            if (canEditServices) {
              return service.status !== 'published'
            }

            return false
          }

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
                      href={`/servicos-municipais/servicos/servico/${service.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Link>
                  </DropdownMenuItem>
                  {canEditService() && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/servicos-municipais/servicos/servico/${service.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isBuscaServicesAdmin && (
                    <>
                      {service.status === 'published' ? (
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            handleUnpublishService(service.id, service.title)
                          }}
                          disabled={
                            operationLoading || isRefreshingAfterOperation
                          }
                        >
                          <Square className="mr-2 h-4 w-4" />
                          Despublicar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            handlePublishService(service.id, service.title)
                          }}
                          disabled={
                            operationLoading || isRefreshingAfterOperation
                          }
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Publicar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteService(service.id, service.title)
                        }}
                        disabled={operationLoading}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        size: 32,
      },
    ]
  }, [
    isBuscaServicesAdmin,
    canEditServices,
    operationLoading,
    isRefreshingAfterOperation,
    handlePublishService,
    handleUnpublishService,
    handleDeleteService,
  ])

  const table = useReactTable({
    data: services,
    columns,
    getRowId: row => row.id,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: updater => {
      setPagination(updater)
      // The useServices hook will automatically refetch when pagination changes
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true, // Enable manual pagination for API
    manualFiltering: true, // Enable manual filtering for API
    pageCount: apiPagination?.total_pages ?? -1, // Set total pages from API
  })

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar serviços</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Show loading state during initial load
  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando serviços...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col pb-4">
        <Label className="py-4">Selecione uma secretaria</Label>
        <Combobox
          options={SECRETARIAS}
          value={selectedSecretaria}
          onValueChange={handleSecretariaChange}
          placeholder="Todas as secretarias"
          searchPlaceholder="Buscar secretaria..."
          emptyMessage="Nenhuma secretaria encontrada."
          className="md:w-auto h-14!"
        />
      </div>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="published">Publicados</TabsTrigger>
          <TabsTrigger value="in_edition">Em edição</TabsTrigger>
          <TabsTrigger value="awaiting_approval">
            {isBuscaServicesAdmin ? 'Pronto para aprovação' : 'Em aprovação'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || isRefreshingAfterOperation}
            onRowClick={service => {
              window.location.href = `/servicos-municipais/servicos/servico/${service.id}`
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="in_edition" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || isRefreshingAfterOperation}
            onRowClick={service => {
              window.location.href = `/servicos-municipais/servicos/servico/${service.id}`
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="awaiting_approval" className="space-y-4">
          <DataTable
            table={table}
            loading={loading || isRefreshingAfterOperation}
            onRowClick={service => {
              window.location.href = `/servicos-municipais/servicos/servico/${service.id}`
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
