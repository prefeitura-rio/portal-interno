'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useEmpresas } from '@/hooks/use-empresas'
import type { EmpregabilidadeEmpresa } from '@/http-gorio/models'
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
  MoreHorizontal,
  Pencil,
  Plus,
  Text,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

/**
 * ============================================================================
 * PAGE: Empresas List
 * ============================================================================
 * Displays a paginated table of all empresas with:
 * - Search by name
 * - Pagination
 * - View/Edit/Delete actions
 * - Create new empresa button
 *
 * PERMISSIONS:
 * - View: All authenticated users
 * - Edit/Delete: Only users with canEditGoRio permission
 */

export default function EmpresasPage() {
  const router = useRouter()
  const { loading: userRoleLoading, canEditGoRio } = useHeimdallUserContext()

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'razao_social', desc: false },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Search query state
  const [searchQuery, setSearchQuery] = React.useState('')

  // Fetch empresas using custom hook
  const { empresas, loading, error, total, pageCount, refetch } = useEmpresas({
    page: pagination.pageIndex + 1, // Convert 0-based to 1-based
    pageSize: pagination.pageSize,
    nome: searchQuery || undefined,
  })

  /**
   * Handle search filter changes
   * Updates searchQuery state which triggers refetch via useEmpresas
   */
  React.useEffect(() => {
    const nameFilter = columnFilters.find(
      filter => filter.id === 'razao_social'
    )
    const newSearchQuery = (nameFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      setSearchQuery(newSearchQuery)
      // Reset to first page when searching
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [columnFilters, searchQuery])

  /**
   * Handle delete action
   *
   * FLOW:
   * 1. Show confirmation dialog
   * 2. Call DELETE /api/empregabilidade/empresas/[cnpj]
   * 3. Handle success/error
   * 4. Refetch data to update list
   */
  const handleDelete = React.useCallback(
    async (empresa: EmpregabilidadeEmpresa) => {
      if (!empresa.cnpj) {
        toast.error('CNPJ não encontrado')
        return
      }

      // Confirm deletion (hard delete - permanent)
      const confirmed = window.confirm(
        `Tem certeza que deseja excluir a empresa "${empresa.razao_social || empresa.nome_fantasia}"?\n\nEsta ação é PERMANENTE e não pode ser desfeita.\n\nA empresa só pode ser excluída se não possuir vagas associadas.`
      )

      if (!confirmed) return

      try {
        const response = await fetch(
          `/api/empregabilidade/empresas/${empresa.cnpj}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete empresa')
        }

        toast.success('Empresa excluída com sucesso!')

        // Refetch data to update list
        refetch()
        router.refresh()
      } catch (error) {
        console.error('Error deleting empresa:', error)
        toast.error('Erro ao excluir empresa', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [refetch, router]
  )

  /**
   * Format CNPJ for display
   * Input: "12345678000190"
   * Output: "12.345.678/0001-90"
   */
  const formatCNPJ = (cnpj: string): string => {
    if (!cnpj) return ''
    const numbers = cnpj.replace(/\D/g, '')
    if (numbers.length !== 14) return cnpj
    return numbers.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }

  /**
   * Define table columns
   *
   * COLUMNS:
   * - razao_social: Company legal name (searchable)
   * - nome_fantasia: Trade name
   * - cnpj: CNPJ (formatted for display)
   * - created_at: Creation date
   * - actions: View/Edit/Delete dropdown
   */
  const columns = React.useMemo<ColumnDef<EmpregabilidadeEmpresa>[]>(() => {
    return [
      {
        id: 'razao_social',
        accessorKey: 'razao_social',
        header: ({
          column,
        }: {
          column: Column<EmpregabilidadeEmpresa, unknown>
        }) => <DataTableColumnHeader column={column} title="Razão Social" />,
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium max-w-[300px] truncate">
              {cell.getValue<string>() || (
                <span className="text-muted-foreground">Não informado</span>
              )}
            </span>
          </div>
        ),
        meta: {
          label: 'Razão Social',
          placeholder: 'Buscar por nome da empresa...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: 'nome_fantasia',
        accessorKey: 'nome_fantasia',
        header: ({
          column,
        }: {
          column: Column<EmpregabilidadeEmpresa, unknown>
        }) => <DataTableColumnHeader column={column} title="Nome Fantasia" />,
        cell: ({ cell }) => (
          <span className="max-w-[200px] truncate">
            {cell.getValue<string>() || (
              <span className="text-muted-foreground">Não informado</span>
            )}
          </span>
        ),
        enableColumnFilter: false,
      },
      {
        id: 'cnpj',
        accessorKey: 'cnpj',
        header: ({
          column,
        }: {
          column: Column<EmpregabilidadeEmpresa, unknown>
        }) => <DataTableColumnHeader column={column} title="CNPJ" />,
        cell: ({ cell }) => {
          const cnpj = cell.getValue<string>()
          return (
            <span className="font-mono text-sm">
              {formatCNPJ(cnpj) || (
                <span className="text-muted-foreground">Não informado</span>
              )}
            </span>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        accessorFn: row => {
          if (!row.created_at) return null
          return new Date(row.created_at).getTime()
        },
        header: ({
          column,
        }: {
          column: Column<EmpregabilidadeEmpresa, unknown>
        }) => <DataTableColumnHeader column={column} title="Data de Criação" />,
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
        enableColumnFilter: false,
      },
      {
        id: 'actions',
        cell: function Cell({ row }) {
          const empresa = row.original
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
                  <Link
                    href={`/gorio/empregabilidade/empresas/${empresa.cnpj}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </Link>
                </DropdownMenuItem>
                {canEditGoRio && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/gorio/empregabilidade/empresas/${empresa.cnpj}/edit`}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(empresa)}
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
  }, [canEditGoRio, handleDelete])

  // Initialize table
  const table = useReactTable({
    data: empresas,
    columns,
    getRowId: row => row.cnpj || '',
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
    manualPagination: true, // Server-side pagination
    manualFiltering: true, // Server-side filtering
    pageCount: pageCount,
    rowCount: total,
  })

  // Show error if data fetch failed
  if (error) {
    return (
      <ContentLayout title="Empresas">
        <div className="rounded-md border border-destructive p-4">
          <p className="text-sm text-destructive font-medium">
            Erro ao carregar empresas
          </p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refetch}
          >
            Tentar novamente
          </Button>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Gestão de Empresas">
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Empresas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header with title and action button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
              <p className="text-muted-foreground">
                Gerencie as empresas cadastradas no sistema
              </p>
            </div>
            {canEditGoRio && (
              <Button asChild>
                <Link href="/gorio/empregabilidade/new/empresa">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Empresa
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          table={table}
          loading={loading}
          onRowClick={(empresa: EmpregabilidadeEmpresa) => {
            if (empresa.cnpj) {
              window.open(
                `/gorio/empregabilidade/empresas/${empresa.cnpj}`,
                '_blank'
              )
            }
          }}
        >
          <DataTableToolbar table={table} />
        </DataTable>
      </div>
    </ContentLayout>
  )
}
