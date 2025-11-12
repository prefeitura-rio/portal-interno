'use client'

import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { TombamentoModal } from '@/components/tombamento-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { DepartmentName } from '@/components/ui/department-name'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useServiceOperationsWithTombamento } from '@/hooks/use-service-operations-with-tombamento'
import { useServices } from '@/hooks/use-services'
import { useTombamentos } from '@/hooks/use-tombamentos'
import type {
  ServiceListItem,
  ServiceStatus,
  ServiceStatusConfig,
} from '@/types/service'
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
  AlertCircle,
  Archive,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Play,
  Send,
  Square,
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
    sendToApproval,
    sendToEdition,
    loading: operationLoading,
    showTombamentoModal: showPublishTombamentoModal,
    selectedServiceForTombamento: selectedPublishServiceForTombamento,
    handleTombamentoSuccess: handlePublishTombamentoSuccess,
    handleTombamentoCancel: handlePublishTombamentoCancel,
  } = useServiceOperationsWithTombamento()
  const { fetchTombamentos, deleteTombamento } = useTombamentos()

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
  const [showTombamentoModal, setShowTombamentoModal] = React.useState(false)
  const [selectedServiceForTombamento, setSelectedServiceForTombamento] =
    React.useState<{ id: string; title: string } | null>(null)
  const [tombamentosMap, setTombamentosMap] = React.useState<
    Map<string, boolean>
  >(new Map())
  const [tombamentosData, setTombamentosData] = React.useState<
    Map<string, { id: string; origem: string; id_servico_antigo: string }>
  >(new Map())
  const [tombamentosLoading, setTombamentosLoading] = React.useState(false)

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

  // Check tombamentos for published services
  React.useEffect(() => {
    const checkTombamentos = async () => {
      if (services.length > 0 && activeTab === 'published') {
        setTombamentosLoading(true)
        try {
          const tombamentosResponse = await fetchTombamentos({ per_page: 100 })
          if (tombamentosResponse?.data?.tombamentos) {
            const tombamentos = tombamentosResponse.data.tombamentos
            const newTombamentosMap = new Map<string, boolean>()
            const newTombamentosData = new Map<
              string,
              { id: string; origem: string; id_servico_antigo: string }
            >()

            // Create a map of service IDs that have tombamentos
            tombamentos.forEach(tombamento => {
              newTombamentosMap.set(tombamento.id_servico_novo, true)
              newTombamentosData.set(tombamento.id_servico_novo, {
                id: tombamento.id,
                origem: tombamento.origem,
                id_servico_antigo: tombamento.id_servico_antigo,
              })
            })

            setTombamentosMap(newTombamentosMap)
            setTombamentosData(newTombamentosData)
          }
        } catch (error) {
          console.error('Error checking tombamentos:', error)
        } finally {
          setTombamentosLoading(false)
        }
      } else {
        setTombamentosLoading(false)
      }
    }

    checkTombamentos()
  }, [services, activeTab, fetchTombamentos])

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
            await publishService(serviceId, serviceName)
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

  const handleTombarService = React.useCallback(
    (serviceId: string, serviceTitle: string) => {
      setSelectedServiceForTombamento({ id: serviceId, title: serviceTitle })
      setShowTombamentoModal(true)
    },
    []
  )

  const handleDestombarService = React.useCallback(
    (serviceId: string, serviceTitle: string) => {
      const tombamentoData = tombamentosData.get(serviceId)
      if (!tombamentoData) return

      openConfirmDialog({
        title: 'Destombar Serviço',
        description: `Tem certeza que deseja destombar o serviço "${serviceTitle}"? Isso irá reverter a migração e o serviço antigo voltará a aparecer normalmente.`,
        confirmText: 'Destombar',
        variant: 'destructive',
        onConfirm: async () => {
          try {
            console.log('🔄 Starting destombar service operation...')
            const success = await deleteTombamento(tombamentoData.id)

            if (success) {
              // Immediately update local state to remove the tombamento
              setTombamentosMap(prev => {
                const newMap = new Map(prev)
                newMap.delete(serviceId)
                return newMap
              })
              setTombamentosData(prev => {
                const newData = new Map(prev)
                newData.delete(serviceId)
                return newData
              })
              console.log('✅ Tombamento removed from local state')
            } else {
              console.error('❌ Failed to destombar service')
            }
          } catch (error) {
            console.error('❌ Error in destombar service flow:', error)
          }
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openConfirmDialog, deleteTombamento, tombamentosData]
  )

  const handleSendToApproval = React.useCallback(
    (serviceId: string, serviceName: string) => {
      openConfirmDialog({
        title: 'Enviar para Aprovação',
        description: `Tem certeza que deseja enviar o serviço "${serviceName}" para aprovação? Um administrador precisará revisar antes da publicação.`,
        confirmText: 'Enviar',
        variant: 'default',
        onConfirm: async () => {
          try {
            setIsRefreshingAfterOperation(true)
            console.log('🔄 Starting send to approval operation...')
            await sendToApproval(serviceId)
            // Add a small delay to ensure API changes are processed
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('🔄 Refetching services after send to approval...')
            setLastRefreshTimestamp(Date.now())
            await refetch()
            console.log('✅ Services list refreshed after send to approval')
          } catch (error) {
            console.error('❌ Error in send to approval flow:', error)
          } finally {
            setIsRefreshingAfterOperation(false)
          }
        },
      })
    },
    [openConfirmDialog, sendToApproval, refetch]
  )

  const handleSendToEdition = React.useCallback(
    (serviceId: string, serviceName: string) => {
      openConfirmDialog({
        title: 'Enviar para Edição',
        description: `Tem certeza que deseja enviar o serviço "${serviceName}" de volta para edição? Ele sairá do estado de aprovação.`,
        confirmText: 'Enviar',
        variant: 'default',
        onConfirm: async () => {
          try {
            setIsRefreshingAfterOperation(true)
            console.log('🔄 Starting send to edition operation...')
            await sendToEdition(serviceId)
            // Add a small delay to ensure API changes are processed
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('🔄 Refetching services after send to edition...')
            setLastRefreshTimestamp(Date.now())
            await refetch()
            console.log('✅ Services list refreshed after send to edition')
          } catch (error) {
            console.error('❌ Error in send to edition flow:', error)
          } finally {
            setIsRefreshingAfterOperation(false)
          }
        },
      })
    },
    [openConfirmDialog, sendToEdition, refetch]
  )

  const handleTombamentoSuccess = React.useCallback(() => {
    // Refresh tombamentos map
    const refreshTombamentos = async () => {
      setTombamentosLoading(true)
      try {
        const tombamentosResponse = await fetchTombamentos({ per_page: 100 })
        if (tombamentosResponse?.data?.tombamentos) {
          const tombamentos = tombamentosResponse.data.tombamentos
          const newTombamentosMap = new Map<string, boolean>()
          const newTombamentosData = new Map<
            string,
            { id: string; origem: string; id_servico_antigo: string }
          >()

          tombamentos.forEach(tombamento => {
            newTombamentosMap.set(tombamento.id_servico_novo, true)
            newTombamentosData.set(tombamento.id_servico_novo, {
              id: tombamento.id,
              origem: tombamento.origem,
              id_servico_antigo: tombamento.id_servico_antigo,
            })
          })

          setTombamentosMap(newTombamentosMap)
          setTombamentosData(newTombamentosData)
        }
      } catch (error) {
        console.error('Error refreshing tombamentos:', error)
      } finally {
        setTombamentosLoading(false)
      }
    }

    refreshTombamentos()
  }, [fetchTombamentos])

  // Define table columns
  const columns = React.useMemo<ColumnDef<ServiceListItem>[]>(() => {
    const baseColumns: ColumnDef<ServiceListItem>[] = [
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

          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[200px] truncate">
                <DepartmentName cd_ua={managingOrganValue} />
              </span>
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
          // Extract date components and create local date to avoid timezone issues
          const sourceDate = new Date(row.published_at)
          const date = new Date(
            sourceDate.getFullYear(),
            sourceDate.getMonth(),
            sourceDate.getDate()
          )
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
          // Extract date components and create local date to avoid timezone issues
          const sourceDate = new Date(row.last_update)
          const date = new Date(
            sourceDate.getFullYear(),
            sourceDate.getMonth(),
            sourceDate.getDate()
          )
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
    ]

    // Add tombamento column only for published services
    if (activeTab === 'published') {
      baseColumns.push({
        id: 'tombamento_pendente',
        accessorKey: 'id',
        header: ({ column }: { column: Column<ServiceListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Tombamento" />
        ),
        cell: ({ row }: { row: any }) => {
          const service = row.original
          const hasTombamento = tombamentosMap.get(service.id)

          // Show loading skeleton while tombamentos are being fetched
          if (tombamentosLoading) {
            return (
              <div className="flex items-center gap-2">
                <div className="animate-pulse">
                  <div className="h-5 w-22 bg-muted rounded-full" />
                </div>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-2">
              {hasTombamento ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200 bg-green-50"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Tombado
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-200 bg-orange-50"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pendente
                </Badge>
              )}
            </div>
          )
        },
        meta: {
          label: 'Tombamento',
          variant: 'select',
          icon: Archive,
        },
        enableColumnFilter: false,
      })
    }

    baseColumns.push({
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
                {/* Send to approval - only for editors on in_edition status */}
                {!isBuscaServicesAdmin &&
                  canEditServices &&
                  service.status === 'in_edition' && (
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation()
                        handleSendToApproval(service.id, service.title)
                      }}
                      disabled={operationLoading || isRefreshingAfterOperation}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar para aprovação
                    </DropdownMenuItem>
                  )}
                {/* Send to edition - for both admins and editors on awaiting_approval status */}
                {canEditServices && service.status === 'awaiting_approval' && (
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation()
                      handleSendToEdition(service.id, service.title)
                    }}
                    disabled={operationLoading || isRefreshingAfterOperation}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Enviar para edição
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
                    {service.status === 'published' &&
                      !tombamentosMap.get(service.id) && (
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            handleTombarService(service.id, service.title)
                          }}
                          disabled={
                            operationLoading || isRefreshingAfterOperation
                          }
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Tombar
                        </DropdownMenuItem>
                      )}
                    {service.status === 'published' &&
                      tombamentosMap.get(service.id) && (
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            handleDestombarService(service.id, service.title)
                          }}
                          disabled={
                            operationLoading || isRefreshingAfterOperation
                          }
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Destombar
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
    })

    return baseColumns
  }, [
    isBuscaServicesAdmin,
    canEditServices,
    operationLoading,
    isRefreshingAfterOperation,
    handlePublishService,
    handleUnpublishService,
    handleDeleteService,
    handleTombarService,
    handleDestombarService,
    handleSendToApproval,
    handleSendToEdition,
    tombamentosMap,
    tombamentosLoading,
    activeTab,
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
        <Label className="py-4">Filtrar por órgão/secretaria</Label>
        <DepartmentCombobox
          value={selectedSecretaria}
          onValueChange={handleSecretariaChange}
          placeholder="Todos os órgãos"
          className="md:w-auto"
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
              router.push(`/servicos-municipais/servicos/servico/${service.id}`)
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
              router.push(`/servicos-municipais/servicos/servico/${service.id}`)
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
              router.push(`/servicos-municipais/servicos/servico/${service.id}`)
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

      {/* Tombamento Modal for manual tombamento */}
      {selectedServiceForTombamento && (
        <TombamentoModal
          open={showTombamentoModal}
          onOpenChange={setShowTombamentoModal}
          serviceId={selectedServiceForTombamento.id}
          serviceTitle={selectedServiceForTombamento.title}
          onSuccess={handleTombamentoSuccess}
        />
      )}

      {/* Tombamento Modal for publish flow */}
      {selectedPublishServiceForTombamento && (
        <TombamentoModal
          open={showPublishTombamentoModal}
          onOpenChange={open => {
            if (!open) {
              handlePublishTombamentoCancel()
            }
          }}
          serviceId={selectedPublishServiceForTombamento.id}
          serviceTitle={selectedPublishServiceForTombamento.title}
          onSuccess={handlePublishTombamentoSuccess}
        />
      )}
    </div>
  )
}
