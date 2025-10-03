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
import { useUserRoleContext } from '@/contexts/user-role-context'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
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
}

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
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

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

// Mock data for MEI Opportunities
const mockOportunidadesMEI: OportunidadeMEI[] = [
  {
    id: '1',
    title: 'Curso de Gestão Financeira para MEI',
    activity: 'Educação e Capacitação',
    offeredBy: 'Secretaria de Desenvolvimento Econômico',
    publishedAt: '2024-01-15',
    expiresAt: '2024-03-15',
    status: 'active',
    managingOrgan: 'desenvolvimento-economico',
    lastUpdate: '2024-01-15',
  },
  {
    id: '2',
    title: 'Workshop de Marketing Digital',
    activity: 'Marketing e Vendas',
    offeredBy: 'Secretaria de Tecnologia',
    publishedAt: '2024-01-10',
    expiresAt: '2024-02-10',
    status: 'expired',
    managingOrgan: 'tecnologia',
    lastUpdate: '2024-01-10',
  },
  {
    id: '3',
    title: 'Consultoria em Planejamento Tributário',
    activity: 'Consultoria',
    offeredBy: 'Secretaria da Fazenda',
    publishedAt: null,
    expiresAt: '2024-04-30',
    status: 'draft',
    managingOrgan: 'fazenda',
    lastUpdate: '2024-01-20',
  },
  {
    id: '4',
    title: 'Programa de Microcrédito',
    activity: 'Financiamento',
    offeredBy: 'Secretaria de Desenvolvimento Econômico',
    publishedAt: '2024-01-05',
    expiresAt: '2024-06-05',
    status: 'active',
    managingOrgan: 'desenvolvimento-economico',
    lastUpdate: '2024-01-05',
  },
  {
    id: '5',
    title: 'Feira de Negócios MEI',
    activity: 'Eventos e Networking',
    offeredBy: 'Secretaria de Turismo',
    publishedAt: '2023-12-01',
    expiresAt: '2023-12-31',
    status: 'expired',
    managingOrgan: 'turismo',
    lastUpdate: '2023-12-01',
  },
]

export function OportunidadesMEIDataTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userRole, loading: userRoleLoading, isAdmin, hasElevatedPermissions } = useUserRoleContext()

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
    'active') as OportunidadeMEIStatus
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSecretaria, setSelectedSecretaria] = React.useState('')

  // Filter opportunities based on active tab and search
  const filteredOportunidades = React.useMemo(() => {
    return mockOportunidadesMEI.filter(oportunidade => {
      // Filter by status
      if (oportunidade.status !== activeTab) return false

      // Filter by secretaria
      if (
        selectedSecretaria &&
        oportunidade.managingOrgan !== selectedSecretaria
      )
        return false

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          oportunidade.title.toLowerCase().includes(query) ||
          oportunidade.activity.toLowerCase().includes(query) ||
          oportunidade.offeredBy.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [activeTab, selectedSecretaria, searchQuery])

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

  // Handle quick actions (simplified for now)
  const handleDeleteOportunidade = React.useCallback(
    (oportunidadeId: string, oportunidadeName: string) => {
      openConfirmDialog({
        title: 'Excluir Oportunidade MEI',
        description: `Tem certeza que deseja excluir a oportunidade "${oportunidadeName}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        variant: 'destructive',
        onConfirm: async () => {
          // TODO: Implement delete functionality when API is ready
          console.log('Delete oportunidade:', oportunidadeId)
        },
      })
    },
    [openConfirmDialog]
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
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
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
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[200px] truncate">
              {cell.getValue<OportunidadeMEI['activity']>()}
            </span>
          </div>
        ),
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
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[200px] truncate">
              {cell.getValue<OportunidadeMEI['offeredBy']>()}
            </span>
          </div>
        ),
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
          const date = new Date(row.publishedAt)
          date.setHours(0, 0, 0, 0)
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
          const date = new Date(row.expiresAt)
          date.setHours(0, 0, 0, 0)
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

          // Helper function to check if user can edit the oportunidade
          const canEditOportunidade = () => {
            if (!userRole) return false

            // Admin and geral users can always edit oportunidades
            if (userRole === 'admin' || userRole === 'geral') {
              return true
            }

            // Editor users can only edit oportunidades that are drafts
            if (userRole === 'editor') {
              return oportunidade.status === 'draft'
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
                      href={`/gorio/oportunidades-mei/oportunidade/${oportunidade.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Link>
                  </DropdownMenuItem>
                  {canEditOportunidade() && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/gorio/oportunidades-mei/oportunidade/${oportunidade.id}`}
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
  }, [isAdmin, userRole, activeTab, handleDeleteOportunidade])

  const table = useReactTable({
    data: filteredOportunidades,
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
    manualPagination: false, // Use client-side pagination for mock data
    manualFiltering: false, // Use client-side filtering for mock data
  })

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
          <TabsTrigger value="active">Oportunidades ativas</TabsTrigger>
          <TabsTrigger value="expired">Oportunidades expiradas</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <DataTable
            table={table}
            loading={userRoleLoading}
            onRowClick={oportunidade => {
              window.location.href = `/gorio/oportunidades-mei/oportunidade/${oportunidade.id}`
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <DataTable
            table={table}
            loading={userRoleLoading}
            onRowClick={oportunidade => {
              window.location.href = `/gorio/oportunidades-mei/oportunidade/${oportunidade.id}`
            }}
          >
            <DataTableToolbar table={table} />
          </DataTable>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <DataTable
            table={table}
            loading={userRoleLoading}
            onRowClick={oportunidade => {
              window.location.href = `/gorio/oportunidades-mei/oportunidade/${oportunidade.id}`
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
