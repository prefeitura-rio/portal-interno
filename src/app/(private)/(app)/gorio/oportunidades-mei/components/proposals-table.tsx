'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileDown,
  Hash,
  Mail,
  MapPin,
  Phone,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { DataTable } from '@/components/data-table/data-table'
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from '@/components/data-table/data-table-action-bar'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { type MEIProposal, useMEIProposals } from '@/hooks/use-mei-proposals'
import type { ModelsLegalEntity } from '@/http-rmi/models/modelsLegalEntity'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface ProposalsTableProps {
  opportunityId: number
  opportunityTitle?: string
}

// Simple schema just to keep consistent form usage (not many validations needed here)
const proposalNoteSchema = z.object({ note: z.string().optional() })
type ProposalNoteForm = z.infer<typeof proposalNoteSchema>

// Format CNPJ: XX.XXX.XXX/XXXX-XX
const formatCNPJ = (cnpj: string | undefined | null): string => {
  if (!cnpj) return '-'
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '')
  // CNPJ must have 14 digits
  if (numbers.length !== 14) return cnpj
  // Format: XX.XXX.XXX/XXXX-XX
  return numbers.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

export function ProposalsTable({
  opportunityId,
  opportunityTitle,
}: ProposalsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedProposal, setSelectedProposal] =
    React.useState<MEIProposal | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  // Cache for legal entity data by CNPJ
  const [legalEntitiesCache, setLegalEntitiesCache] = React.useState<
    Map<string, ModelsLegalEntity>
  >(new Map())
  const [loadingLegalEntities, setLoadingLegalEntities] = React.useState<
    Set<string>
  >(new Set())
  // Ref to track which CNPJs are being fetched to avoid duplicate requests
  const fetchingRef = React.useRef<Set<string>>(new Set())
  // Ref to track which CNPJs have failed to avoid retrying
  const failedCnpjsRef = React.useRef<Set<string>>(new Set())
  // Refs to track current state for useEffect
  const cacheRef = React.useRef<Map<string, ModelsLegalEntity>>(new Map())
  const loadingRef = React.useRef<Set<string>>(new Set())

  // Sync refs with state
  React.useEffect(() => {
    cacheRef.current = legalEntitiesCache
  }, [legalEntitiesCache])

  React.useEffect(() => {
    loadingRef.current = loadingLegalEntities
  }, [loadingLegalEntities])

  const noteForm = useForm<ProposalNoteForm>({
    resolver: zodResolver(proposalNoteSchema),
    defaultValues: { note: '' },
  })

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, 300)

  // Handle search filter changes
  React.useEffect(() => {
    const companyNameFilter = columnFilters.find(
      filter => filter.id === 'companyName'
    )
    const newSearchQuery = (companyNameFilter?.value as string) || ''

    if (newSearchQuery !== searchQuery) {
      debouncedSearch(newSearchQuery)
    }
  }, [columnFilters, searchQuery, debouncedSearch])

  // Convert column filters to API filters
  const filters = React.useMemo(() => {
    const statusFilter = columnFilters.find(filter => filter.id === 'status')

    const statusValue = statusFilter?.value as string
    const status =
      statusValue && statusValue !== ''
        ? (statusValue as 'approved' | 'pending' | 'rejected')
        : undefined

    return {
      status,
      search: searchQuery || undefined,
    }
  }, [columnFilters, searchQuery])

  const {
    proposals,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateStatus,
    updateMultipleStatuses,
  } = useMEIProposals({
    opportunityId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    filters,
  })

  const handlePaginationChange = React.useCallback(
    (
      updater: PaginationState | ((prev: PaginationState) => PaginationState)
    ) => {
      const newPagination =
        typeof updater === 'function' ? updater(pagination) : updater
      setPagination(newPagination)
    },
    [pagination]
  )

  React.useEffect(() => {
    if (selectedProposal && proposals.length > 0) {
      const updated = proposals.find(p => p.id === selectedProposal.id)
      if (updated) setSelectedProposal(updated)
    }
  }, [proposals, selectedProposal])

  // Fetch legal entity data for proposals - runs automatically when proposals load
  React.useEffect(() => {
    if (!proposals || proposals.length === 0) return

    const fetchLegalEntities = async () => {
      // Use refs to check current state (always up-to-date)
      const cnpjsToFetch = proposals
        .map(p => p.mei_empresa_id)
        .filter(
          (cnpj): cnpj is string =>
            !!cnpj &&
            !cacheRef.current.has(cnpj) &&
            !loadingRef.current.has(cnpj) &&
            !fetchingRef.current.has(cnpj) &&
            !failedCnpjsRef.current.has(cnpj)
        )

      if (cnpjsToFetch.length === 0) {
        return
      }

      // Mark as fetching in ref
      cnpjsToFetch.forEach(cnpj => fetchingRef.current.add(cnpj))

      // Mark as loading
      setLoadingLegalEntities(prev => {
        const newSet = new Set(prev)
        cnpjsToFetch.forEach(cnpj => newSet.add(cnpj))
        return newSet
      })

      // Fetch all legal entities in parallel
      const fetchPromises = cnpjsToFetch.map(async cnpj => {
        try {
          const response = await fetch(`/api/legal-entity/${cnpj}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              return { cnpj, legalEntity: data.data, success: true }
            }
          }
          // Mark as failed and show toast
          failedCnpjsRef.current.add(cnpj)
          toast.error(
            `Não foi possível carregar as informações do MEI de CNPJ ${cnpj}`
          )
          return { cnpj, legalEntity: null, success: false }
        } catch (error) {
          console.error(`Error fetching legal entity for CNPJ ${cnpj}:`, error)
          // Mark as failed and show toast
          failedCnpjsRef.current.add(cnpj)
          toast.error(
            `Não foi possível carregar as informações do MEI de CNPJ ${cnpj}`
          )
          return { cnpj, legalEntity: null, success: false }
        }
      })

      const results = await Promise.all(fetchPromises)

      // Update cache with fetched data (only successful ones)
      setLegalEntitiesCache(prev => {
        const newMap = new Map(prev)
        results.forEach(result => {
          if (result.success && result.legalEntity) {
            newMap.set(result.cnpj, result.legalEntity)
          }
        })
        return newMap
      })

      // Remove from loading set and ref
      setLoadingLegalEntities(prev => {
        const newSet = new Set(prev)
        cnpjsToFetch.forEach(cnpj => {
          newSet.delete(cnpj)
          fetchingRef.current.delete(cnpj)
        })
        return newSet
      })
    }

    fetchLegalEntities()
  }, [proposals])

  const handleRowClick = React.useCallback(
    async (proposal: MEIProposal) => {
      setSelectedProposal(proposal)
      setIsSheetOpen(true)
      noteForm.reset({ note: '' })

      // Fetch legal entity if not cached and not already failed
      if (
        proposal.mei_empresa_id &&
        !legalEntitiesCache.has(proposal.mei_empresa_id) &&
        !loadingLegalEntities.has(proposal.mei_empresa_id) &&
        !fetchingRef.current.has(proposal.mei_empresa_id) &&
        !failedCnpjsRef.current.has(proposal.mei_empresa_id)
      ) {
        fetchingRef.current.add(proposal.mei_empresa_id)
        setLoadingLegalEntities(prev =>
          new Set(prev).add(proposal.mei_empresa_id!)
        )
        try {
          const response = await fetch(
            `/api/legal-entity/${proposal.mei_empresa_id}`
          )
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              setLegalEntitiesCache(prev => {
                const newMap = new Map(prev)
                newMap.set(proposal.mei_empresa_id!, data.data)
                return newMap
              })
            } else {
              // Mark as failed and show toast
              failedCnpjsRef.current.add(proposal.mei_empresa_id!)
              toast.error(
                `Não foi possível carregar as informações do MEI de CNPJ ${proposal.mei_empresa_id}`
              )
            }
          } else {
            // Mark as failed and show toast
            failedCnpjsRef.current.add(proposal.mei_empresa_id!)
            toast.error(
              `Não foi possível carregar as informações do MEI de CNPJ ${proposal.mei_empresa_id}`
            )
          }
        } catch (error) {
          console.error(
            `Error fetching legal entity for CNPJ ${proposal.mei_empresa_id}:`,
            error
          )
          // Mark as failed and show toast
          failedCnpjsRef.current.add(proposal.mei_empresa_id!)
          toast.error(
            `Não foi possível carregar as informações do MEI de CNPJ ${proposal.mei_empresa_id}`
          )
        } finally {
          setLoadingLegalEntities(prev => {
            const newSet = new Set(prev)
            newSet.delete(proposal.mei_empresa_id!)
            return newSet
          })
          fetchingRef.current.delete(proposal.mei_empresa_id!)
        }
      }
    },
    [noteForm, legalEntitiesCache, loadingLegalEntities]
  )

  const handleApprove = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'approved')
      if (updated) toast.success('Proposta confirmada com sucesso!')
    },
    [updateStatus]
  )

  const handleSetPending = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'pending')
      if (updated) toast.success('Proposta definida como pendente!')
    },
    [updateStatus]
  )

  const handleReject = React.useCallback(
    async (proposal: MEIProposal) => {
      const updated = await updateStatus(proposal.id, 'rejected')
      if (updated) toast.success('Proposta recusada!')
    },
    [updateStatus]
  )

  const handleBulkApprove = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toApprove = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'approved')
      if (toApprove.length === 0) return
      const ids = toApprove.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'approved')
      if (success) {
        table.resetRowSelection()
        toast.success(`${toApprove.length} proposta(s) confirmada(s)!`)
      }
    },
    [updateMultipleStatuses]
  )

  const handleBulkPending = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toPending = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'pending')
      if (toPending.length === 0) return
      const ids = toPending.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'pending')
      if (success) {
        table.resetRowSelection()
        toast.success(
          `${toPending.length} proposta(s) definida(s) como pendente(s)!`
        )
      }
    },
    [updateMultipleStatuses]
  )

  const handleBulkReject = React.useCallback(
    async (table: any) => {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const toReject = selectedRows
        .map((r: any) => r.original)
        .filter((p: MEIProposal) => p.status !== 'rejected')
      if (toReject.length === 0) return
      const ids = toReject.map((p: MEIProposal) => p.id)
      const success = await updateMultipleStatuses(ids, 'rejected')
      if (success) {
        table.resetRowSelection()
        toast.success(`${toReject.length} proposta(s) recusada(s)!`)
      }
    },
    [updateMultipleStatuses]
  )

  const handleDownloadSpreadsheet = React.useCallback(() => {
    const proposalsToExport = proposals
    if (proposalsToExport.length === 0) return

    const headers = [
      'Razão social',
      'Nome Fantasia',
      'CNPJ',
      'Valor da proposta',
      'Data de envio',
      'Status',
      'Natureza Jurídica',
      'Porte',
      'CNAE Fiscal',
      'Capital Social',
      'Situação Cadastral',
      'Início de Atividade',
      'Responsável - Qualificação',
      'Responsável - CPF',
      'E-mail',
      'Telefone',
      'Endereço Completo',
    ]

    // Create worksheet data
    const worksheetData = proposalsToExport.map(p => {
      const statusMap: Record<string, string> = {
        approved: 'Confirmado',
        pending: 'Pendente',
        rejected: 'Recusado',
      }

      const legalEntity = p.mei_empresa_id
        ? legalEntitiesCache.get(p.mei_empresa_id)
        : null
      const razaoSocial = legalEntity?.razao_social || p.companyName || '-'

      // Build complete address from legal entity or use proposal address
      const address = legalEntity?.endereco
        ? [
            legalEntity.endereco.tipo_logradouro,
            legalEntity.endereco.logradouro,
            legalEntity.endereco.numero,
            legalEntity.endereco.complemento,
            legalEntity.endereco.bairro,
            legalEntity.endereco.municipio_nome,
            legalEntity.endereco.uf,
            legalEntity.endereco.cep,
          ]
            .filter(Boolean)
            .join(', ')
        : p.address || ''

      // Get contact information from legal entity or proposal
      const contactEmail = legalEntity?.contato?.email || p.email || ''
      const contactPhone = legalEntity?.contato?.telefone?.[0]
        ? `${legalEntity.contato.telefone[0].ddd || ''} ${legalEntity.contato.telefone[0].telefone || ''}`.trim()
        : p.phone || ''

      return {
        'Razão social': razaoSocial,
        'Nome Fantasia': legalEntity?.nome_fantasia || '-',
        CNPJ: formatCNPJ(p.mei_empresa_id),
        'Valor da proposta': p.amount,
        'Data de envio': new Date(p.submittedAt).toLocaleDateString('pt-BR'),
        Status: statusMap[p.status] || p.status,
        'Natureza Jurídica': legalEntity?.natureza_juridica?.descricao || '-',
        Porte: legalEntity?.porte?.descricao || '-',
        'CNAE Fiscal': legalEntity?.cnae_fiscal || '-',
        'Capital Social':
          legalEntity?.capital_social !== undefined &&
          legalEntity?.capital_social !== null
            ? legalEntity.capital_social.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : '-',
        'Situação Cadastral': legalEntity?.situacao_cadastral?.descricao || '-',
        'Início de Atividade': legalEntity?.inicio_atividade_data
          ? new Date(legalEntity.inicio_atividade_data).toLocaleDateString(
              'pt-BR'
            )
          : '-',
        'Responsável - Qualificação':
          legalEntity?.responsavel?.qualificacao_descricao || '-',
        'Responsável - CPF': legalEntity?.responsavel?.cpf || '-',
        'E-mail': contactEmail,
        Telefone: contactPhone,
        'Endereço Completo': address,
      }
    })

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)

    // Set column widths for better readability
    const columnWidths = headers.map(header => {
      const maxContentLength = Math.max(
        header.length,
        ...worksheetData.map(
          row => String(row[header as keyof typeof row] || '').length
        )
      )
      return { wch: Math.min(Math.max(maxContentLength + 2, 10), 50) }
    })
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Propostas')

    // Generate file name
    const fileName = opportunityTitle
      ? `propostas_${opportunityTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}`
      : `propostas_oportunidade_${opportunityId}`

    // Write file and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`)
  }, [proposals, opportunityId, opportunityTitle, legalEntitiesCache])

  const columns = React.useMemo<ColumnDef<MEIProposal>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'companyName',
        accessorKey: 'companyName',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Razão social" />
        ),
        cell: ({ row }) => {
          const proposal = row.original
          const legalEntity = proposal.mei_empresa_id
            ? legalEntitiesCache.get(proposal.mei_empresa_id)
            : null
          const displayName =
            legalEntity?.razao_social || proposal.companyName || '-'
          const isLoading =
            proposal.mei_empresa_id &&
            loadingLegalEntities.has(proposal.mei_empresa_id) &&
            !legalEntity

          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {isLoading ? 'Carregando...' : displayName}
              </span>
            </div>
          )
        },
        meta: {
          label: 'Empresa/CNPJ',
          placeholder: 'Buscar por empresa ou CNPJ',
          variant: 'text',
          icon: Building2,
        },
        enableColumnFilter: true,
      },
      {
        id: 'cnpj',
        accessorKey: 'mei_empresa_id',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="CNPJ" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {formatCNPJ(row.original.mei_empresa_id)}
          </span>
        ),
        enableColumnFilter: false,
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Valor da proposta" />
        ),
        cell: ({ cell }) => {
          const value = cell.getValue<number>()
          return (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                {value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          )
        },
        enableColumnFilter: false,
      },
      {
        id: 'submittedAt',
        accessorKey: 'submittedAt',
        accessorFn: row => {
          // Parse ISO date string as local date to avoid timezone issues
          const isoDate = new Date(row.submittedAt)
          const date = new Date(
            isoDate.getFullYear(),
            isoDate.getMonth(),
            isoDate.getDate()
          )
          return date.getTime()
        },
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de envio" />
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
        enableColumnFilter: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<MEIProposal, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<MEIProposal['status']>()
          const statusConfig = {
            approved: {
              label: 'Confirmado',
              className: 'bg-green-100 text-green-800',
              icon: CheckCircle,
            },
            pending: {
              label: 'Pendente',
              className: 'bg-yellow-100 text-yellow-800',
              icon: Clock,
            },
            rejected: {
              label: 'Recusado',
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
          } as const
          const config = statusConfig[status]
          const StatusIcon = config.icon
          return (
            <Badge className={config.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          return value === rowValue
        },
        meta: {
          label: 'Status',
          variant: 'select',
          options: [
            { label: 'Todos', value: '' },
            { label: 'Confirmado', value: 'approved' },
            { label: 'Pendente', value: 'pending' },
            { label: 'Recusado', value: 'rejected' },
          ],
        },
        enableColumnFilter: true,
      },
    ],
    [legalEntitiesCache, loadingLegalEntities]
  )

  const table = useReactTable({
    data: proposals,
    columns,
    getRowId: row => row.id,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true, // Filters are applied server-side via API
    pageCount: apiPagination?.totalPages || 0,
    rowCount: apiPagination?.total || 0,
  })

  // Show loading state only on initial load (no data yet)
  if (loading && proposals.length === 0 && !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando propostas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && proposals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar propostas
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Propostas</h2>
        <Button variant="outline" onClick={handleDownloadSpreadsheet}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar XLSX
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.approvedCount}
              </p>
              <p className="text-sm text-green-600">Confirmados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {summary.pendingCount}
              </p>
              <p className="text-sm text-yellow-600">Pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {summary.rejectedCount}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Proposta</SheetTitle>
            <SheetDescription>
              Informações completas da empresa
            </SheetDescription>
          </SheetHeader>
          {selectedProposal && (
            <>
              <div className="flex-1 overflow-y-auto py-6 pt-0 px-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-lg">
                        <Building2 className="w-6 h-6 bg-background-light" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {(() => {
                            const legalEntity = selectedProposal.mei_empresa_id
                              ? legalEntitiesCache.get(
                                  selectedProposal.mei_empresa_id
                                )
                              : null
                            return (
                              legalEntity?.razao_social ||
                              selectedProposal.companyName ||
                              '-'
                            )
                          })()}
                        </h3>
                        <p className="text-sm text-muted-foreground">Empresa</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações da Proposta
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            CNPJ
                          </Label>
                          <p className="font-mono text-sm">
                            {formatCNPJ(selectedProposal.mei_empresa_id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Valor da proposta
                          </Label>
                          <p className="text-sm">
                            {selectedProposal.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Data de envio
                          </Label>
                          <p>
                            {new Date(
                              selectedProposal.submittedAt
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const legalEntity = selectedProposal.mei_empresa_id
                      ? legalEntitiesCache.get(selectedProposal.mei_empresa_id)
                      : null

                    if (!legalEntity) {
                      const isLoading =
                        selectedProposal.mei_empresa_id &&
                        loadingLegalEntities.has(
                          selectedProposal.mei_empresa_id
                        )
                      return isLoading ? (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Informações da Empresa
                          </h4>
                          <div className="flex items-center justify-center py-4">
                            <LoadingSpinner size="sm" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              Carregando dados da empresa...
                            </span>
                          </div>
                        </div>
                      ) : null
                    }

                    return (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Informações da Empresa
                        </h4>
                        <div className="grid gap-4">
                          {legalEntity.razao_social && (
                            <div className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Razão Social
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.razao_social}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.nome_fantasia && (
                            <div className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Nome Fantasia
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.nome_fantasia}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.cnpj && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  CNPJ
                                </Label>
                                <p className="font-mono text-sm">
                                  {formatCNPJ(legalEntity.cnpj)}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.natureza_juridica?.descricao && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Natureza Jurídica
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.natureza_juridica.descricao}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.porte?.descricao && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Porte
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.porte.descricao}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.cnae_fiscal && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  CNAE Fiscal
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.cnae_fiscal}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.capital_social !== undefined &&
                            legalEntity.capital_social !== null && (
                              <div className="flex items-center gap-3">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Capital Social
                                  </Label>
                                  <p className="text-sm">
                                    {legalEntity.capital_social.toLocaleString(
                                      'pt-BR',
                                      {
                                        style: 'currency',
                                        currency: 'BRL',
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          {legalEntity.situacao_cadastral?.descricao && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Situação Cadastral
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.situacao_cadastral.descricao}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.inicio_atividade_data && (
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Início de Atividade
                                </Label>
                                <p className="text-sm">
                                  {new Date(
                                    legalEntity.inicio_atividade_data
                                  ).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          )}
                          {legalEntity.responsavel && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Responsável
                                </Label>
                                <p className="text-sm">
                                  {legalEntity.responsavel
                                    .qualificacao_descricao || '-'}
                                  {legalEntity.responsavel.cpf && (
                                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                                      (CPF: {legalEntity.responsavel.cpf})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {(() => {
                    const legalEntity = selectedProposal.mei_empresa_id
                      ? legalEntitiesCache.get(selectedProposal.mei_empresa_id)
                      : null

                    const contactEmail =
                      legalEntity?.contato?.email || selectedProposal.email
                    const contactPhone = legalEntity?.contato?.telefone?.[0]
                      ? `${legalEntity.contato.telefone[0].ddd || ''} ${legalEntity.contato.telefone[0].telefone || ''}`.trim()
                      : selectedProposal.phone
                    const address = legalEntity?.endereco
                      ? [
                          legalEntity.endereco.tipo_logradouro,
                          legalEntity.endereco.logradouro,
                          legalEntity.endereco.numero,
                          legalEntity.endereco.complemento,
                          legalEntity.endereco.bairro,
                          legalEntity.endereco.municipio_nome,
                          legalEntity.endereco.uf,
                          legalEntity.endereco.cep,
                        ]
                          .filter(Boolean)
                          .join(', ')
                      : selectedProposal.address

                    if (!contactEmail && !contactPhone && !address) return null

                    return (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Contato
                        </h4>
                        <div className="grid gap-4">
                          {contactEmail && (
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  E-mail
                                </Label>
                                <p className="text-sm">{contactEmail}</p>
                              </div>
                            </div>
                          )}
                          {contactPhone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Telefone
                                </Label>
                                <p className="text-sm">{contactPhone}</p>
                              </div>
                            </div>
                          )}
                          {address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Endereço
                                </Label>
                                <p className="text-sm">{address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <SheetFooter className="flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  <Button
                    onClick={() => handleApprove(selectedProposal)}
                    className="w-full bg-green-50 border border-green-200 text-green-700"
                    disabled={selectedProposal.status === 'approved'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar proposta
                  </Button>
                  <Button
                    onClick={() => handleSetPending(selectedProposal)}
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700"
                    disabled={selectedProposal.status === 'pending'}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Deixar pendente
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedProposal)}
                    className="w-full bg-red-50! border border-red-200 text-red-700"
                    disabled={selectedProposal.status === 'rejected'}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar proposta
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTable table={table} loading={loading} onRowClick={handleRowClick}>
        <DataTableToolbar table={table} />

        <DataTableActionBar table={table}>
          <DataTableActionBarSelection table={table} />
          <DataTableActionBarAction
            tooltip="Confirmar propostas selecionadas"
            onClick={() => handleBulkApprove(table)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar propostas
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir propostas selecionadas como pendentes"
            onClick={() => handleBulkPending(table)}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendentes
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Recusar propostas selecionadas"
            onClick={() => handleBulkReject(table)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Recusar propostas
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Exportar propostas para XLSX"
            onClick={handleDownloadSpreadsheet}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar XLSX
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>
    </div>
  )
}
