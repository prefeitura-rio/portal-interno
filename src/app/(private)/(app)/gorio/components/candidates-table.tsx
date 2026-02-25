'use client'

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
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileDown,
  Hash,
  Mail,
  MapPin,
  Phone,
  Text,
  User,
  UserPlus,
  XCircle,
} from 'lucide-react'
import * as React from 'react'

import type { InformacaoComplementar } from '@/app/(private)/(app)/gorio/empregabilidade/components/informacoes-complementares-creator'
import { NewCandidateDialog } from '@/app/(private)/(app)/gorio/empregabilidade/components/new-candidate-dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import {
  type Candidato,
  type CandidatoStatus,
  useCandidatos,
} from '@/hooks/use-candidatos'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface CandidatesTableProps {
  empregabilidadeId: string
  empregabilidadeTitle?: string
  informacoesComplementares?: InformacaoComplementar[]
  /** Título exibido acima dos cards (ex: "Candidaturas na vaga"). Quando definido, mostra também os botões Adicionar candidato e Exportar XLSX. */
  headerTitle?: string
  /** Chamado ao clicar em "Adicionar candidato" (ex: abre o dialog na página). Só mostra o botão se este callback for passado. */
  onAddCandidateClick?: () => void
}

const STATUS_LABELS: Record<CandidatoStatus, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
}

export function CandidatesTable({
  empregabilidadeId,
  empregabilidadeTitle,
  informacoesComplementares = [],
  headerTitle,
  onAddCandidateClick,
}: CandidatesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'enrollmentDate', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] = React.useState<
    Record<string, boolean>
  >({ etapa_id: false })
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedCandidato, setSelectedCandidato] =
    React.useState<Candidato | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [showNewCandidateDialog, setShowNewCandidateDialog] =
    React.useState(false)

  // Debounced search for API (filter while user types without hitting API every keystroke)
  const [searchForApi, setSearchForApi] = React.useState('')
  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setSearchForApi(value),
    300
  )
  React.useEffect(() => {
    const raw =
      (columnFilters.find(f => f.id === 'candidateName')?.value as string) ?? ''
    debouncedSetSearch(raw)
  }, [columnFilters, debouncedSetSearch])

  // Get user permissions
  const { canEditGoRio } = useHeimdallUserContext()

  // Convert column filters to candidato filters (status = backend is mapped in API route; search = debounced)
  const filters = React.useMemo(() => {
    const statusFilter = columnFilters.find(filter => filter.id === 'status')
    const statusValue = statusFilter?.value as
      | CandidatoStatus[]
      | CandidatoStatus
      | undefined
    const statusArray =
      statusValue === undefined || statusValue === null
        ? undefined
        : Array.isArray(statusValue)
          ? statusValue.length > 0
            ? statusValue
            : undefined
          : [statusValue]

    const etapaFilter = columnFilters.find(f => f.id === 'etapa_id')?.value
    const etapaId =
      Array.isArray(etapaFilter) && etapaFilter.length > 0
        ? etapaFilter[0]
        : typeof etapaFilter === 'string'
          ? etapaFilter
          : undefined

    return {
      status: statusArray,
      search: searchForApi.trim() || undefined,
      etapa_id: etapaId,
    }
  }, [columnFilters, searchForApi])

  // Use the custom hook to fetch candidatos
  const {
    candidatos,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateCandidatoStatus,
    updateCandidatoEtapa,
    updateMultipleCandidatoStatuses,
    updateMultipleCandidatoEtapas,
    refetch,
  } = useCandidatos({
    empregabilidadeId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    filters,
  })

  const etapaOptions = React.useMemo(() => {
    const etapas = candidatos[0]?.vaga?.etapas ?? []
    const recebida: { label: string; value: string; disabled: true } = {
      label: 'Candidatura recebida',
      value: '__candidatura_recebida__',
      disabled: true,
    }
    return [
      recebida,
      ...etapas.map(e => ({
        label: e.titulo ?? `Etapa ${e.ordem}`,
        value: e.id,
      })),
    ]
  }, [candidatos])

  const handleConfirmCandidato = React.useCallback(
    async (candidato: Candidato) => {
      try {
        const updated = await updateCandidatoStatus(candidato.id, 'approved')
        if (updated) {
          setSelectedCandidato(prev =>
            prev ? { ...prev, status: 'approved' } : prev
          )
          toast.success('Candidato confirmado com sucesso!')
        }
      } catch (error) {
        console.error('Erro ao confirmar candidato:', error)
        toast.error('Erro ao confirmar candidato', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoStatus]
  )

  const handleRejectCandidato = React.useCallback(
    async (candidato: Candidato) => {
      try {
        const updated = await updateCandidatoStatus(candidato.id, 'rejected')
        if (updated) {
          setSelectedCandidato(prev =>
            prev ? { ...prev, status: 'rejected' } : prev
          )
          toast.success('Candidato recusado!')
        }
      } catch (error) {
        console.error('Erro ao recusar candidato:', error)
        toast.error('Erro ao recusar candidato', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoStatus]
  )

  const handleSetPendingCandidato = React.useCallback(
    async (candidato: Candidato) => {
      try {
        const updated = await updateCandidatoStatus(candidato.id, 'pending')
        if (updated) {
          setSelectedCandidato(prev =>
            prev ? { ...prev, status: 'pending' } : prev
          )
          toast.success('Candidato definido como pendente!')
        }
      } catch (error) {
        console.error('Erro ao definir candidato como pendente:', error)
        toast.error('Erro ao definir como pendente', {
          description:
            error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoStatus]
  )

  const handleSetEtapa = React.useCallback(
    async (candidato: Candidato, idEtapa: string | null) => {
      try {
        await updateCandidatoEtapa(candidato.id, idEtapa)
        setSelectedCandidato(prev =>
          prev ? { ...prev, currentEtapaId: idEtapa ?? undefined } : prev
        )
        toast.success('Etapa atualizada com sucesso!')
      } catch (err) {
        console.error('Erro ao alterar etapa:', err)
        toast.error('Erro ao alterar etapa', {
          description: err instanceof Error ? err.message : 'Erro inesperado',
        })
      }
    },
    [updateCandidatoEtapa]
  )

  const handlePaginationChange = React.useCallback((updater: any) => {
    setPagination(prev => {
      const newPagination =
        typeof updater === 'function' ? updater(prev) : updater
      return newPagination
    })
  }, [])

  const handleRowClick = React.useCallback((candidato: Candidato) => {
    setSelectedCandidato(candidato)
    setIsSheetOpen(true)
  }, [])

  const columns = React.useMemo<ColumnDef<Candidato>[]>(
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
        id: 'candidateName',
        accessorKey: 'candidateName',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Candidato" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Candidato['candidateName']>()}
            </span>
          </div>
        ),
        meta: {
          label: 'Candidato',
          placeholder: 'Buscar candidato por nome, cpf ou email',
          variant: 'text',
          icon: User,
        },
        enableColumnFilter: true,
        size: 220,
        minSize: 160,
      },
      {
        id: 'cpf',
        accessorKey: 'cpf',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ cell }) => (
          <span className="font-mono text-sm">
            {cell.getValue<Candidato['cpf']>()}
          </span>
        ),
        meta: {
          label: 'CPF',
          placeholder: 'Buscar CPF...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: false,
        size: 130,
        maxSize: 150,
      },
      {
        id: 'etapa',
        accessorFn: (row): string => {
          const totalEtapas = 1 + (row.vaga?.etapas?.length ?? 0)
          if (row.currentEtapaId == null) {
            return `Candidatura recebida 1/${totalEtapas}`
          }
          const etapas = row.vaga?.etapas ?? []
          const index = etapas.findIndex(e => e.id === row.currentEtapaId)
          if (index < 0) return `—`
          const numeroEtapa = index + 2
          const titulo = etapas[index]?.titulo ?? `Etapa ${numeroEtapa}`
          return `${titulo} ${numeroEtapa}/${totalEtapas}`
        },
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Etapa" />
        ),
        cell: ({ row }) => {
          const totalEtapas = 1 + (row.original.vaga?.etapas?.length ?? 0)
          if (!row.original.vaga?.etapas?.length) {
            return <span className="text-muted-foreground">—</span>
          }
          if (row.original.currentEtapaId == null) {
            return (
              <span className="text-sm">
                Candidatura recebida 1/{totalEtapas}
              </span>
            )
          }
          const etapas = row.original.vaga.etapas
          const index = etapas.findIndex(
            e => e.id === row.original.currentEtapaId
          )
          if (index < 0) return <span className="text-muted-foreground">—</span>
          const numeroEtapa = index + 2
          const titulo = etapas[index]?.titulo ?? `Etapa ${numeroEtapa}`
          return (
            <span className="text-sm">
              {titulo} {numeroEtapa}/{totalEtapas}
            </span>
          )
        },
        enableColumnFilter: false,
        size: 200,
        minSize: 160,
      },
      {
        id: 'enrollmentDate',
        accessorKey: 'enrollmentDate',
        accessorFn: row => {
          const isoDate = new Date(row.enrollmentDate)
          const date = new Date(
            isoDate.getFullYear(),
            isoDate.getMonth(),
            isoDate.getDate()
          )
          return date.getTime()
        },
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de Inscrição" />
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
          label: 'Data de Inscrição',
          variant: 'dateRange',
          icon: Calendar,
        },
        enableColumnFilter: false,
        size: 140,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Candidato, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Candidato['status']>()
          const statusConfig = {
            approved: {
              label: 'Aprovado',
              variant: 'default' as const,
              className: 'bg-green-100 text-green-800',
              icon: CheckCircle,
            },
            pending: {
              label: 'Pendente',
              variant: 'default' as const,
              className: 'bg-yellow-100 text-yellow-800',
              icon: Clock,
            },
            cancelled: {
              label: 'Cancelado',
              variant: 'secondary' as const,
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
            rejected: {
              label: 'Recusado',
              variant: 'secondary' as const,
              className: 'text-red-600 border-red-200 bg-red-50',
              icon: XCircle,
            },
          }

          const config = statusConfig[status]
          const StatusIcon = config.icon

          return (
            <Badge variant={config.variant} className={config.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string
          const arr = Array.isArray(value)
            ? value
            : value != null
              ? [value]
              : []
          return arr.length > 0 && arr.includes(rowValue)
        },
        meta: {
          label: 'Status',
          variant: 'select',
          options: [
            { label: 'Aprovado', value: 'approved' },
            { label: 'Pendente', value: 'pending' },
            { label: 'Cancelado', value: 'cancelled' },
            { label: 'Recusado', value: 'rejected' },
          ],
        },
        enableColumnFilter: true,
        size: 120,
      },
      {
        id: 'etapa_id',
        accessorFn: (row): string | null => row.currentEtapaId ?? null,
        header: () => 'Etapa',
        cell: () => null,
        meta: {
          label: 'Etapa',
          variant: 'select',
          options: etapaOptions,
        },
        enableColumnFilter: true,
        enableSorting: false,
        enableHiding: false,
        size: 180,
      },
    ],
    [etapaOptions]
  )

  const table = useReactTable({
    data: candidatos,
    columns,
    getRowId: row => row.id,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    onColumnVisibilityChange: updater =>
      setColumnVisibility(prev =>
        typeof updater === 'function' ? updater(prev) : updater
      ),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: apiPagination?.totalPages || 0,
    rowCount: apiPagination?.total || 0,
  })

  const handleBulkConfirmCandidatos = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const candidatosToConfirm = selectedRows
        .map(row => row.original)
        .filter(candidato => candidato.status !== 'approved')

      if (candidatosToConfirm.length === 0) {
        return
      }

      const cpfs = candidatosToConfirm.map(c => c.cpf)
      await updateMultipleCandidatoStatuses(cpfs, 'approved')

      table.resetRowSelection()
      toast.success(
        `${candidatosToConfirm.length} candidato(s) confirmado(s) com sucesso!`
      )
    } catch (error) {
      console.error('Erro ao confirmar candidatos em lote:', error)
      toast.error('Erro ao confirmar candidatos', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoStatuses])

  const handleBulkSetPending = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const candidatosToSetPending = selectedRows
        .map(row => row.original)
        .filter(candidato => candidato.status !== 'pending')

      if (candidatosToSetPending.length === 0) {
        return
      }

      const cpfs = candidatosToSetPending.map(c => c.cpf)
      await updateMultipleCandidatoStatuses(cpfs, 'pending')

      table.resetRowSelection()
      toast.success(
        `${candidatosToSetPending.length} candidato(s) definido(s) como pendente(s)!`
      )
    } catch (error) {
      console.error('Erro ao definir candidatos como pendentes em lote:', error)
      toast.error('Erro ao definir candidatos como pendentes', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoStatuses])

  const handleBulkRejectCandidatos = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const candidatosToReject = selectedRows
        .map(row => row.original)
        .filter(candidato => candidato.status !== 'rejected')

      if (candidatosToReject.length === 0) {
        return
      }

      const cpfs = candidatosToReject.map(c => c.cpf)
      await updateMultipleCandidatoStatuses(cpfs, 'rejected')

      table.resetRowSelection()
      toast.success(`${candidatosToReject.length} candidato(s) reprovado(s)!`)
    } catch (error) {
      console.error('Erro ao reprovar candidatos em lote:', error)
      toast.error('Erro ao reprovar candidatos', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoStatuses])

  const handleBulkAdvanceEtapa = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const selectedCandidatos = selectedRows.map(row => row.original)

      if (selectedCandidatos.length === 0) {
        return
      }

      const first = selectedCandidatos[0]

      const getStageKey = (candidato: Candidato) =>
        `${candidato.vaga?.id ?? ''}::${
          candidato.currentEtapaId ?? '__candidatura_recebida__'
        }`

      const allSameStage = selectedCandidatos.every(
        candidato => getStageKey(candidato) === getStageKey(first)
      )

      if (!allSameStage) {
        toast.error(
          'Só é possível avançar etapa em massa para candidatos na mesma etapa.'
        )
        return
      }

      const etapas = first.vaga?.etapas ?? []

      if (etapas.length === 0) {
        toast.error('Esta vaga não possui etapas configuradas.')
        return
      }

      let nextEtapaId: string | null = null

      if (first.currentEtapaId == null) {
        nextEtapaId = etapas[0]?.id ?? null
      } else {
        const currentIndex = etapas.findIndex(
          etapa => etapa.id === first.currentEtapaId
        )

        if (currentIndex < 0) {
          toast.error('Etapa atual não encontrada na vaga.')
          return
        }

        const nextEtapa = etapas[currentIndex + 1] ?? null

        if (!nextEtapa) {
          toast.info(
            'Os candidatos selecionados já estão na última etapa do processo.'
          )
          return
        }

        nextEtapaId = nextEtapa.id
      }

      if (!nextEtapaId) {
        toast.error('Não foi possível determinar a próxima etapa.')
        return
      }

      const cpfs = selectedCandidatos.map(c => c.cpf)

      await updateMultipleCandidatoEtapas(cpfs, nextEtapaId)

      table.resetRowSelection()
      toast.success(
        'Etapa avançada com sucesso para os candidatos selecionados.'
      )
    } catch (error) {
      console.error('Erro ao avançar etapa em lote:', error)
      toast.error('Erro ao avançar etapa dos candidatos', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleCandidatoEtapas])

  const buildCandidaturasWorkbook = React.useCallback(
    (candidatosToExport: Candidato[]) => {
      const customTitles = Array.from(
        new Set(
          candidatosToExport.flatMap(c =>
            (c.customFields ?? []).map(f => f.title)
          )
        )
      ).filter(Boolean)

      const headers = [
        'Nome',
        'CPF',
        'E-mail',
        'Telefone',
        'Data de Inscrição',
        'Status',
        'Endereço',
        'Bairro',
        'Cidade',
        'Estado',
        ...customTitles,
      ]

      const worksheetData = candidatosToExport.map(c => {
        const row: Record<string, string | number> = {
          Nome: c.candidateName ?? '',
          CPF: c.cpf ?? '',
          'E-mail': c.email ?? '',
          Telefone: c.phone ?? '',
          'Data de Inscrição': c.enrollmentDate
            ? new Date(c.enrollmentDate).toLocaleDateString('pt-BR')
            : '',
          Status: STATUS_LABELS[c.status] ?? c.status,
          Endereço: c.address ?? '',
          Bairro: c.neighborhood ?? '',
          Cidade: c.city ?? '',
          Estado: c.state ?? '',
        }
        customTitles.forEach(title => {
          const field = c.customFields?.find(f => f.title === title)
          row[title] = field?.value ?? ''
        })
        return row
      })

      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const columnWidths = headers.map((_, i) => {
        const key = headers[i]
        const maxLen = Math.max(
          key.length,
          ...worksheetData.map(r => String(r[key] ?? '').length)
        )
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
      })
      worksheet['!cols'] = columnWidths
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidaturas')
      return workbook
    },
    []
  )

  const handleDownloadSpreadsheet = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/empregabilidade/candidaturas?id_vaga=${empregabilidadeId}&perPage=10000`
      )
      if (!res.ok) throw new Error('Falha ao buscar candidaturas')
      const json = await res.json()
      const allCandidatos: Candidato[] = json.candidatos ?? []
      if (allCandidatos.length === 0) {
        toast.info('Nenhuma candidatura para exportar')
        return
      }

      const workbook = buildCandidaturasWorkbook(allCandidatos)
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5)
      const safeTitle = (empregabilidadeTitle ?? empregabilidadeId)
        .replace(/[^a-zA-Z0-9\s]/g, '_')
        .replace(/\s+/g, '_')
      XLSX.writeFile(
        workbook,
        `candidaturas_vaga_${safeTitle}_${timestamp}.xlsx`
      )
      toast.success('Planilha exportada com sucesso')
    } catch (err) {
      console.error('Erro ao exportar candidaturas:', err)
      toast.error('Erro ao exportar planilha', {
        description: err instanceof Error ? err.message : 'Erro inesperado',
      })
    }
  }, [empregabilidadeId, empregabilidadeTitle, buildCandidaturasWorkbook])

  const handleDownloadSpreadsheetSelected = React.useCallback(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const candidatosToExport = selectedRows.map(row => row.original)

    if (candidatosToExport.length === 0) {
      toast.info('Selecione ao menos um candidato para exportar')
      return
    }

    try {
      const workbook = buildCandidaturasWorkbook(candidatosToExport)
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5)
      const safeTitle = (empregabilidadeTitle ?? empregabilidadeId)
        .replace(/[^a-zA-Z0-9\s]/g, '_')
        .replace(/\s+/g, '_')
      XLSX.writeFile(
        workbook,
        `candidaturas_selecionadas_${safeTitle}_${timestamp}.xlsx`
      )
      toast.success(
        `${candidatosToExport.length} candidatura(s) exportada(s) com sucesso`
      )
    } catch (err) {
      console.error('Erro ao exportar candidaturas selecionadas:', err)
      toast.error('Erro ao exportar planilha', {
        description: err instanceof Error ? err.message : 'Erro inesperado',
      })
    }
  }, [
    table,
    empregabilidadeId,
    empregabilidadeTitle,
    buildCandidaturasWorkbook,
  ])

  if (loading && candidatos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" className="mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Erro ao carregar candidatos</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {headerTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {headerTitle}
          </h2>
          <div className="flex items-center gap-2">
            {onAddCandidateClick && (
              <Button variant="outline" onClick={onAddCandidateClick}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar candidato
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadSpreadsheet}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar XLSX
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {summary.total || 0}
              </p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {summary.pendingCount || 0}
              </p>
              <p className="text-sm text-yellow-600">Pendentes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.approvedCount || 0}
              </p>
              <p className="text-sm text-green-600">Aprovados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {summary.rejectedCount || 0}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Candidatura</SheetTitle>
            <SheetDescription>
              Informações completas do candidato e inscrição
            </SheetDescription>
          </SheetHeader>
          {selectedCandidato && (
            <>
              <div className="flex-1 overflow-y-auto py-6 pt-0 px-4">
                <div className="space-y-6">
                  {/* Candidate Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-lg">
                        <User className="w-6 h-6 bg-background-light" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedCandidato.candidateName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Candidato
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações Pessoais
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            CPF
                          </Label>
                          <p className="font-mono text-sm">
                            {selectedCandidato.cpf}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            E-mail
                          </Label>
                          <p className="text-sm">{selectedCandidato.email}</p>
                        </div>
                      </div>
                      {selectedCandidato.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Telefone
                            </Label>
                            <p className="text-sm">{selectedCandidato.phone}</p>
                          </div>
                        </div>
                      )}
                      {(selectedCandidato.address ||
                        selectedCandidato.neighborhood) && (
                        <>
                          {selectedCandidato.address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Endereço
                                </Label>
                                <p className="text-sm">
                                  {selectedCandidato.address}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedCandidato.neighborhood && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Bairro
                                </Label>
                                <p className="text-sm">
                                  {selectedCandidato.neighborhood}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Application Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações da Candidatura
                    </h4>
                    <div className="grid gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Data de Inscrição
                          </Label>
                          <p>
                            {new Date(
                              selectedCandidato.enrollmentDate
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Status
                          </Label>
                          <div className="mt-1">
                            {(() => {
                              const statusConfig = {
                                approved: {
                                  label: 'Aprovado',
                                  className: 'bg-green-100 text-green-800',
                                },
                                pending: {
                                  label: 'Pendente',
                                  className: 'bg-yellow-100 text-yellow-800',
                                },
                                cancelled: {
                                  label: 'Cancelado',
                                  className:
                                    'text-red-600 border-red-200 bg-red-50',
                                },
                                rejected: {
                                  label: 'Recusado',
                                  className:
                                    'text-red-600 border-red-200 bg-red-50',
                                },
                              }
                              const config =
                                statusConfig[selectedCandidato.status]
                              return (
                                <Badge className={config.className}>
                                  {config.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Etapas do processo (quando a vaga tem etapas) */}
                  {selectedCandidato.vaga?.etapas &&
                    selectedCandidato.vaga.etapas.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Etapa no processo
                        </h4>
                        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                          <ul className="space-y-2">
                            {/* Etapa default: candidatura recebida (id_etapa_atual null) */}
                            <li className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-background/60">
                              <span className="text-sm">
                                <span className="text-muted-foreground font-mono mr-2">
                                  1.
                                </span>
                                Candidatura recebida (Default do sistema)
                              </span>
                              {selectedCandidato.currentEtapaId == null && (
                                <Badge variant="secondary" className="shrink-0">
                                  Atual
                                </Badge>
                              )}
                            </li>
                            {selectedCandidato.vaga.etapas.map(
                              (etapa, index) => {
                                const numeroEtapa = index + 2
                                const isCurrent =
                                  selectedCandidato.currentEtapaId === etapa.id
                                return (
                                  <li
                                    key={etapa.id}
                                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-background/60"
                                  >
                                    <span className="text-sm">
                                      <span className="text-muted-foreground font-mono mr-2">
                                        {numeroEtapa}.
                                      </span>
                                      {etapa.titulo ?? `Etapa ${numeroEtapa}`}
                                    </span>
                                    {isCurrent && (
                                      <Badge
                                        variant="secondary"
                                        className="shrink-0"
                                      >
                                        Atual
                                      </Badge>
                                    )}
                                  </li>
                                )
                              }
                            )}
                          </ul>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Definir etapa
                            </Label>
                            <Select
                              value={
                                selectedCandidato.currentEtapaId ??
                                '__candidatura_recebida__'
                              }
                              onValueChange={value => {
                                const idEtapa =
                                  value === '__candidatura_recebida__'
                                    ? null
                                    : value
                                handleSetEtapa(selectedCandidato, idEtapa)
                              }}
                            >
                              <SelectTrigger size="sm" className="w-full">
                                <SelectValue placeholder="Selecione a etapa" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__candidatura_recebida__"
                                  disabled
                                >
                                  1. Candidatura recebida
                                </SelectItem>
                                {selectedCandidato.vaga.etapas.map(
                                  (etapa, index) => {
                                    const numeroEtapa = index + 2
                                    return (
                                      <SelectItem
                                        key={etapa.id}
                                        value={etapa.id}
                                      >
                                        {numeroEtapa}.{' '}
                                        {etapa.titulo ?? `Etapa ${numeroEtapa}`}
                                      </SelectItem>
                                    )
                                  }
                                )}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Avançar ou voltar para qualquer etapa do processo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Custom Fields */}
                  {selectedCandidato.customFields &&
                    selectedCandidato.customFields.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          Informações Complementares
                        </h4>
                        <div className="space-y-3">
                          {selectedCandidato.customFields.map(field => {
                            const info =
                              informacoesComplementares.find(
                                info => info.id === field.id
                              ) || null

                            return (
                              <div
                                key={field.id}
                                className="flex items-start gap-3"
                              >
                                <div className="flex-1">
                                  <Label className="text-sm text-muted-foreground">
                                    {info?.title || field.title}
                                  </Label>
                                  <div className="text-sm mt-1">
                                    <span className="font-medium">
                                      {field.value || (
                                        <span className="text-muted-foreground italic">
                                          (sem valor)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <SheetFooter className="flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <Button
                    onClick={() => handleConfirmCandidato(selectedCandidato)}
                    className="w-full bg-green-50 border border-green-200 text-green-700 hover:bg-green-100!"
                    disabled={selectedCandidato.status === 'approved'}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar candidato
                  </Button>
                  <Button
                    onClick={() => handleSetPendingCandidato(selectedCandidato)}
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100!"
                    disabled={selectedCandidato.status === 'pending'}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Definir como pendente
                  </Button>
                  <Button
                    onClick={() => handleRejectCandidato(selectedCandidato)}
                    variant="destructive"
                    className="w-full sm:col-span-2"
                    disabled={selectedCandidato.status === 'rejected'}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar candidato
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTable table={table} onRowClick={handleRowClick}>
        <DataTableToolbar table={table} />

        <DataTableActionBar table={table}>
          <DataTableActionBarSelection table={table} />
          <DataTableActionBarAction
            tooltip="Aprovar todos os candidatos selecionados"
            onClick={handleBulkConfirmCandidatos}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprovar candidatos
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Reprovar todos os candidatos selecionados"
            onClick={handleBulkRejectCandidatos}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reprovar candidatos
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir todos os candidatos selecionados como pendentes (candidatura enviada)"
            onClick={handleBulkSetPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendente
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Só é possível avançar etapa em massa para candidatos na mesma etapa."
            onClick={handleBulkAdvanceEtapa}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Avançar etapa
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Exportar candidaturas selecionadas para XLSX"
            onClick={handleDownloadSpreadsheetSelected}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar XLSX
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>

      {/* New Candidate Dialog */}
      <NewCandidateDialog
        open={showNewCandidateDialog}
        onOpenChange={setShowNewCandidateDialog}
        vagaId={empregabilidadeId}
        vagaTitle={empregabilidadeTitle || 'esta vaga'}
        informacoesComplementares={informacoesComplementares}
        onSuccess={refetch}
      />
    </div>
  )
}
