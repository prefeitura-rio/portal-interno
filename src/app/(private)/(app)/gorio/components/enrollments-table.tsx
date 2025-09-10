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
  Calendar,
  CheckCircle,
  Clock,
  FileDown,
  Hash,
  Mail,
  Phone,
  Text,
  User,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
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
import { useEnrollments } from '@/hooks/use-enrollments'
import type { Enrollment, EnrollmentStatus } from '@/types/course'
import { toast } from 'sonner'

// Constantes para validação de certificados
const VALID_CERTIFICATE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'] as const
const COURSE_FINISHED_STATUSES = ['finished', 'ENCERRADO'] as const

// Schema de validação para o certificado
const certificateSchema = z.object({
  certificateUrl: z
    .string()
    .optional()
    .refine(
      (url) => {
        // Se a URL for fornecida, deve ser válida
        if (!url || url.trim() === '') return true
        try {
          new URL(url)
          return VALID_CERTIFICATE_EXTENSIONS.some(ext => url.toLowerCase().includes(ext))
        } catch {
          return false
        }
      },
      `URL deve apontar para um arquivo de certificado válido (${VALID_CERTIFICATE_EXTENSIONS.join(', ').toUpperCase()})`
    ),
})

type CertificateFormData = z.infer<typeof certificateSchema>

/**
 * Props do componente EnrollmentsTable
 */
interface EnrollmentsTableProps {
  /** ID do curso */
  courseId: string
  /** Título do curso para exibição */
  courseTitle?: string
  /** Dados do curso necessários para validações */
  course?: {
    /** Se o curso oferece certificado */
    has_certificate?: boolean
    /** Localizações do curso (para cursos presenciais) */
    locations?: Array<{ class_end_date?: string }>
    /** Classe remota do curso (para cursos online) */
    remote_class?: { class_end_date?: string }
    /** Modalidade do curso (ONLINE, PRESENCIAL, etc.) */
    modalidade?: string
    /** Status atual do curso */
    status?: string
  }
}

export function EnrollmentsTable({
  courseId,
  courseTitle,
  course,
}: EnrollmentsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'enrollmentDate', desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedEnrollment, setSelectedEnrollment] =
    React.useState<Enrollment | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [confirmDialog, setConfirmDialog] = React.useState({
    open: false,
    type: 'remove_concluded' as const,
  })

  // Hook do formulário para validação do certificado
  const certificateForm = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      certificateUrl: '',
    },
  })

  /**
   * Calcula a data de término do curso baseado na modalidade
   * Para cursos online: usa remote_class.class_end_date
   * Para cursos presenciais: usa a data mais recente de locations
   * @returns Data de término do curso ou null se não encontrada
   */
  const getCourseEndDate = React.useMemo(() => {
    if (!course) return null

    const classEndDates: Date[] = []

    // Para cursos ONLINE/Remoto
    if (
      (course.modalidade === 'ONLINE' || course.modalidade === 'Remoto') &&
      course.remote_class?.class_end_date
    ) {
      const endDate = new Date(course.remote_class.class_end_date)
      if (!isNaN(endDate.getTime())) {
        classEndDates.push(endDate)
      }
    }

    // Para cursos PRESENCIAL/Presencial/SEMIPRESENCIAL
    if (
      (course.modalidade === 'PRESENCIAL' ||
        course.modalidade === 'Presencial' ||
        course.modalidade === 'SEMIPRESENCIAL') &&
      course.locations
    ) {
      course.locations.forEach(location => {
        if (location.class_end_date) {
          const endDate = new Date(location.class_end_date)
          if (!isNaN(endDate.getTime())) {
            classEndDates.push(endDate)
          }
        }
      })
    }

    // Retorna a data de término mais recente
    if (classEndDates.length > 0) {
      return new Date(Math.max(...classEndDates.map(d => d.getTime())))
    }

    return null
  }, [course])

  /**
   * Estados do curso calculados e memoizados para performance
   * Inclui verificação de término por data e por status
   */
  const courseStates = React.useMemo(() => {
    const courseEndDate = getCourseEndDate
    const now = new Date()
    const isCourseFinishedByDate = courseEndDate ? now > courseEndDate : false
    const isCourseFinishedByStatus = course?.status ? COURSE_FINISHED_STATUSES.includes(course.status as any) : false
    const isCourseFinished = isCourseFinishedByDate || isCourseFinishedByStatus
    const hasCertificate = course?.has_certificate || false

    return {
      courseEndDate,
      isCourseFinishedByDate,
      isCourseFinishedByStatus,
      isCourseFinished,
      hasCertificate,
    }
  }, [getCourseEndDate, course?.status, course?.has_certificate])

  const {
    courseEndDate,
    isCourseFinishedByDate,
    isCourseFinishedByStatus,
    isCourseFinished,
    hasCertificate,
  } = courseStates

  // Convert column filters to enrollment filters
  const filters = React.useMemo(() => {
    const statusFilter = columnFilters.find(filter => filter.id === 'status')
    const candidateNameFilter = columnFilters.find(
      filter => filter.id === 'candidateName'
    )

    // For single status filter, convert to array format if value exists and is not empty
    const statusValue = statusFilter?.value as string
    const statusArray =
      statusValue && statusValue !== ''
        ? [statusValue as EnrollmentStatus]
        : undefined

    return {
      status: statusArray,
      search: candidateNameFilter?.value as string,
    }
  }, [columnFilters])

  // Use the custom hook to fetch enrollments
  const {
    enrollments,
    summary,
    pagination: apiPagination,
    loading,
    error,
    updateEnrollmentStatus,
    updateMultipleEnrollmentStatuses,
    updateEnrollmentCertificate,
    refetch,
  } = useEnrollments({
    courseId,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    filters,
  })

  const handleConfirmEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      try {
        const updated = await updateEnrollmentStatus(enrollment.id, 'approved')
        if (updated) {
          // Update the selected enrollment immediately with the new status
          setSelectedEnrollment(prev =>
            prev ? { ...prev, status: 'approved' } : prev
          )
          toast.success('Inscrição confirmada com sucesso!')
        }
      } catch (error) {
        console.error('Erro ao confirmar inscrição:', error)
        toast.error('Erro ao confirmar inscrição', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentStatus]
  )

  const handleCancelEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      try {
        const updated = await updateEnrollmentStatus(enrollment.id, 'rejected')
        if (updated) {
          // Update the selected enrollment immediately with the new status
          setSelectedEnrollment(prev =>
            prev ? { ...prev, status: 'rejected' } : prev
          )
          toast.success('Inscrição recusada!')
        }
      } catch (error) {
        console.error('Erro ao recusar inscrição:', error)
        toast.error('Erro ao recusar inscrição', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentStatus]
  )

  /**
   * Marca uma inscrição como concluída
   * Atualiza o status para concluded
   * @param enrollment - Inscrição a ser marcada como concluída
   */
  const handleConcludedCourse = React.useCallback(
    async (enrollment: Enrollment) => {
      try {
        const updated = await updateEnrollmentStatus(enrollment.id, 'concluded')
        if (updated) {
          setSelectedEnrollment(prev =>
            prev ? { ...prev, status: 'concluded' } : prev
          )
          toast.success('Inscrição marcada como concluída!')
        }
      } catch (error) {
        console.error('Erro ao marcar inscrição como concluída:', error)
        toast.error('Erro ao marcar inscrição como concluída', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentStatus]
  )

  /**
   * Mostra modal de confirmação para remover status de concluído
   * @param enrollment - Inscrição a ter o status de concluído removido
   */
  const handleRemoveConcludedStatus = React.useCallback(
    (enrollment: Enrollment) => {
      setConfirmDialog({
        open: true,
        type: 'remove_concluded',
      })
    },
    []
  )

  /**
   * Confirma a remoção do status de concluído e remove o certificado
   * @param enrollment - Inscrição a ter o status de concluído removido
   */
  const confirmRemoveConcludedStatus = React.useCallback(
    async (enrollment: Enrollment) => {
      try {
        // Remove o status de concluído
        const updated = await updateEnrollmentStatus(enrollment.id, 'approved')
        if (updated) {
          // Remove o certificado também
          if (enrollment.certificateUrl) {
            await updateEnrollmentCertificate(enrollment.id, '')
          }
          
          setSelectedEnrollment(prev =>
            prev ? { ...prev, status: 'approved', certificateUrl: undefined } : prev
          )
          
          // Reset do formulário de certificado
          certificateForm.reset({
            certificateUrl: '',
          })
          
          toast.success('Status de concluído removido e certificado excluído!')
        }
      } catch (error) {
        console.error('Erro ao remover status de concluído:', error)
        toast.error('Erro ao remover status de concluído', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentStatus, updateEnrollmentCertificate, certificateForm]
  )

  const handleSetPendingEnrollment = React.useCallback(
    async (enrollment: Enrollment) => {
      try {
        const updated = await updateEnrollmentStatus(enrollment.id, 'pending')
        if (updated) {
          // Update the selected enrollment immediately with the new status
          setSelectedEnrollment(prev =>
            prev ? { ...prev, status: 'pending' } : prev
          )
          toast.success('Inscrição definida como pendente!')
        }
      } catch (error) {
        console.error('Erro ao definir inscrição como pendente:', error)
        toast.error('Erro ao definir inscrição como pendente', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentStatus]
  )

  /**
   * Salva a URL do certificado de uma inscrição
   * @param enrollment - Inscrição para salvar o certificado
   * @param certificateUrl - URL do certificado
   */
  const handleSaveCertificate = React.useCallback(
    async (enrollment: Enrollment, certificateUrl: string) => {
      try {
        const updated = await updateEnrollmentCertificate(enrollment.id, certificateUrl)
        if (updated) {
          // Update the selected enrollment immediately with the new certificate URL
          setSelectedEnrollment(prev =>
            prev ? { ...prev, certificateUrl } : prev
          )
          // Reset form to show success state
          certificateForm.reset({
            certificateUrl: certificateUrl,
          })
          
          // Show success toast
          if (certificateUrl.trim() === '') {
            toast.success('Certificado removido com sucesso!')
          } else {
            toast.success('Certificado salvo com sucesso!')
          }
        }
      } catch (error) {
        console.error('Erro ao salvar certificado:', error)
        toast.error('Erro ao salvar certificado', {
          description: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    },
    [updateEnrollmentCertificate, certificateForm]
  )

  // Handle pagination changes
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

  // Update selectedEnrollment when enrollments data changes
  React.useEffect(() => {
    if (selectedEnrollment && enrollments.length > 0) {
      const updatedEnrollment = enrollments.find(
        e => e.id === selectedEnrollment.id
      )
      if (updatedEnrollment) {
        setSelectedEnrollment(updatedEnrollment)
      }
    }
  }, [enrollments, selectedEnrollment])

  const handleRowClick = React.useCallback((enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setIsSheetOpen(true)
    // Reset do formulário de certificado quando uma nova inscrição é selecionada
    certificateForm.reset({
      certificateUrl: enrollment.certificateUrl || '',
    })
  }, [certificateForm])

  const columns = React.useMemo<ColumnDef<Enrollment>[]>(
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
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Candidato" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {cell.getValue<Enrollment['candidateName']>()}
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
      },
      {
        id: 'cpf',
        accessorKey: 'cpf',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="CPF" />
        ),
        cell: ({ cell }) => (
          <span className="font-mono text-sm">
            {cell.getValue<Enrollment['cpf']>()}
          </span>
        ),
        meta: {
          label: 'CPF',
          placeholder: 'Buscar CPF...',
          variant: 'text',
          icon: Text,
        },
        enableColumnFilter: false,
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="E-mail" />
        ),
        cell: ({ cell }) => (
          <span className="text-sm text-muted-foreground">
            {cell.getValue<Enrollment['email']>()}
          </span>
        ),
      },
      {
        id: 'enrollmentDate',
        accessorKey: 'enrollmentDate',
        accessorFn: row => {
          const date = new Date(row.enrollmentDate)
          date.setHours(0, 0, 0, 0)
          return date.getTime()
        },
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
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
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<Enrollment, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Enrollment['status']>()
          const statusConfig = {
            approved: {
              label: 'Confirmado',
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
            concluded: {
              label: 'Concluído',
              variant: 'default' as const,
              className: 'bg-blue-100 text-blue-800',
              icon: CheckCircle,
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
          return value === rowValue
        },
        meta: {
          label: 'Status',
          variant: 'select',
          options: [
            { label: 'Todos', value: '' },
            { label: 'Confirmado', value: 'approved' },
            { label: 'Pendente', value: 'pending' },
            { label: 'Cancelado', value: 'cancelled' },
            { label: 'Recusado', value: 'rejected' },
            { label: 'Concluído', value: 'concluded' },
          ],
        },
        enableColumnFilter: true,
      },
    ],
    []
  )

  const table = useReactTable({
    data: enrollments,
    columns,
    getRowId: row => row.id,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: apiPagination?.totalPages || 0,
    rowCount: apiPagination?.total || 0,
  })

  const handleBulkConfirmEnrollments = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const enrollmentsToConfirm = selectedRows
        .map(row => row.original)
        .filter(enrollment => enrollment.status !== 'approved')

      if (enrollmentsToConfirm.length === 0) {
        return
      }

      // Use bulk update API
      const enrollmentIds = enrollmentsToConfirm.map(e => e.id)
      const success = await updateMultipleEnrollmentStatuses(enrollmentIds, 'approved')

      if (success) {
        // Clear selection after successful update
        table.resetRowSelection()
        toast.success(`${enrollmentsToConfirm.length} inscrição(ões) confirmada(s) com sucesso!`)
      }
    } catch (error) {
      console.error('Erro ao confirmar inscrições em lote:', error)
      toast.error('Erro ao confirmar inscrições', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleEnrollmentStatuses])

  const handleBulkSetPending = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const enrollmentsToSetPending = selectedRows
        .map(row => row.original)
        .filter(enrollment => enrollment.status !== 'pending')

      if (enrollmentsToSetPending.length === 0) {
        return
      }

      // Use bulk update API
      const enrollmentIds = enrollmentsToSetPending.map(e => e.id)
      const success = await updateMultipleEnrollmentStatuses(enrollmentIds, 'pending')

      if (success) {
        // Clear selection after successful update
        table.resetRowSelection()
        toast.success(`${enrollmentsToSetPending.length} inscrição(ões) definida(s) como pendente(s)!`)
      }
    } catch (error) {
      console.error('Erro ao definir inscrições como pendentes em lote:', error)
      toast.error('Erro ao definir inscrições como pendentes', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleEnrollmentStatuses])

  const handleDownloadSpreadsheet = React.useCallback(() => {
    // Always export all enrollments, not just selected ones
    const enrollmentsToExport = enrollments

    if (enrollmentsToExport.length === 0) {
      return
    }

    // Get all unique custom field titles
    const allCustomFieldTitles = Array.from(
      new Set(
        enrollmentsToExport
          .flatMap(enrollment => enrollment.customFields || [])
          .map(field => field.title)
      )
    )

    // Create CSV headers
    const headers = [
      'Nome',
      'CPF',
      'E-mail',
      'Telefone',
      'Data de Inscrição',
      'Status',
      'Motivo',
      'Observações Administrativas',
      ...allCustomFieldTitles,
    ]

    // Create CSV content
    const csvContent = [
      headers,
      ...enrollmentsToExport.map(enrollment => {
        const customFieldValues = allCustomFieldTitles.map(title => {
          const field = enrollment.customFields?.find(f => f.title === title)
          return field?.value || ''
        })

        return [
          enrollment.candidateName,
          enrollment.cpf,
          enrollment.email,
          enrollment.phone || '',
          new Date(enrollment.enrollmentDate).toLocaleDateString('pt-BR'),
          enrollment.status,
          enrollment.reason || '',
          enrollment.notes || '',
          ...customFieldValues,
        ]
      }),
    ]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)

    // Use course title if available, otherwise fallback to course ID
    const fileName = courseTitle
      ? `inscricoes_curso_${courseTitle.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}`
      : `inscricoes_curso_${courseId}`

    link.setAttribute('download', `${fileName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [enrollments, courseId, courseTitle])

  const handleBulkCancelEnrollments = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const enrollmentsToCancel = selectedRows
        .map(row => row.original)
        .filter(enrollment => enrollment.status !== 'rejected')

      if (enrollmentsToCancel.length === 0) {
        return
      }

      // Use bulk update API
      const enrollmentIds = enrollmentsToCancel.map(e => e.id)
      const success = await updateMultipleEnrollmentStatuses(enrollmentIds, 'rejected')

      if (success) {
        // Clear selection after successful update
        table.resetRowSelection()
        toast.success(`${enrollmentsToCancel.length} inscrição(ões) recusada(s) com sucesso!`)
      }
    } catch (error) {
      console.error('Erro ao recusar inscrições em lote:', error)
      toast.error('Erro ao recusar inscrições', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleEnrollmentStatuses])

  const handleBulkConcludeEnrollments = React.useCallback(async () => {
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows
      const enrollmentsToConclude = selectedRows
        .map(row => row.original)
        .filter(enrollment => enrollment.status !== 'concluded')

      if (enrollmentsToConclude.length === 0) {
        return
      }

      // Use bulk update API
      const enrollmentIds = enrollmentsToConclude.map(e => e.id)
      const success = await updateMultipleEnrollmentStatuses(enrollmentIds, 'concluded')

      if (success) {
        // Clear selection after successful update
        table.resetRowSelection()
        toast.success(`${enrollmentsToConclude.length} inscrição(ões) marcada(s) como concluída(s)!`)
      }
    } catch (error) {
      console.error('Erro ao marcar inscrições como concluídas em lote:', error)
      toast.error('Erro ao marcar inscrições como concluídas', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }, [table, updateMultipleEnrollmentStatuses])

  // Show loading state
  if (loading && enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Inscrições no Curso
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando inscrições...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Inscrições no Curso
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar inscrições
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
        <h2 className="text-2xl font-semibold tracking-tight">
          Inscrições no Curso
        </h2>
        <Button variant="outline" onClick={handleDownloadSpreadsheet}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {summary.totalVacancies}
              </p>
              <p className="text-sm text-blue-600">Total de Vagas</p>
            </div>
          </div> */}

          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {summary.confirmedCount}
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
                {summary.cancelledCount}
              </p>
              <p className="text-sm text-red-600">Recusados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {summary.concludedCount}
              </p>
              <p className="text-sm text-blue-600">Concluídos</p>
            </div>
          </div>

          {/* <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {summary.remainingVacancies}
              </p>
              <p className="text-sm text-gray-600">Vagas Restantes</p>
            </div>
          </div> */}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="md:max-w-xl!">
          <SheetHeader>
            <SheetTitle>Detalhes da Inscrição</SheetTitle>
            <SheetDescription>
              Informações completas do candidato
            </SheetDescription>
          </SheetHeader>
          {selectedEnrollment && (
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
                          {selectedEnrollment.candidateName}
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
                            {selectedEnrollment.cpf}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            E-mail
                          </Label>
                          <p className="text-sm">{selectedEnrollment.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Telefone
                          </Label>
                          <p className="text-sm">{selectedEnrollment.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Informações da Inscrição
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
                              selectedEnrollment.enrollmentDate
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
                                  label: 'Confirmado',
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
                                concluded: {
                                  label: 'Concluído',
                                  className:
                                    'text-blue-600 border-blue-200 bg-blue-50',
                                },
                              }
                              const config =
                                statusConfig[selectedEnrollment.status]
                              return (
                                <Badge className={config.className}>
                                  {config.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                      {selectedEnrollment.reason && (
                        <div className="flex items-start gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Motivo
                            </Label>
                            <p className="text-sm mt-1">
                              {selectedEnrollment.reason}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedEnrollment.customFields &&
                        selectedEnrollment.customFields.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                              Informações Complementares
                            </Label>
                            {selectedEnrollment.customFields.map(field => (
                              <div
                                key={field.id}
                                className="flex items-start gap-3"
                              >
                                <div className="flex-1">
                                  <Label className="text-sm text-muted-foreground">
                                    {field.title}
                                    {field.required && (
                                      <span className="text-red-500">*</span>
                                    )}
                                  </Label>
                                  <p className="text-sm mt-1">{field.value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                  {/* Campo de certificado - só aparece se o curso tem certificado */}
                  {hasCertificate && (
                    <div className="flex items-start flex-col gap-3">
                      <div>
                        <Label className={`text-sm font-medium uppercase tracking-wide ${
                          !isCourseFinished || 
                          selectedEnrollment.status !== 'concluded'
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        }`}>
                          URL para o certificado de conclusão da formação
                        </Label>
                      </div>
                      <div className="w-full space-y-2">
                        <div className="flex gap-2">
                          <Input
                            {...certificateForm.register('certificateUrl')}
                            placeholder="https://exemplo.com/certificado.pdf"
                            disabled={
                              !isCourseFinished || 
                              selectedEnrollment.status !== 'concluded'
                            }
                            className={certificateForm.formState.errors.certificateUrl ? 'border-red-500' : ''}
                            aria-label="URL do certificado de conclusão"
                            aria-describedby="certificate-help"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const formData = certificateForm.getValues()
                              if (formData.certificateUrl !== undefined) {
                                handleSaveCertificate(selectedEnrollment, formData.certificateUrl)
                              }
                            }}
                            disabled={
                              !isCourseFinished || 
                              selectedEnrollment.status !== 'concluded' ||
                              !certificateForm.formState.isValid
                            }
                            size="sm"
                            className="whitespace-nowrap"
                          >
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              handleSaveCertificate(selectedEnrollment, '')
                              certificateForm.reset({
                                certificateUrl: '',
                              })
                            }}
                            disabled={
                              !isCourseFinished || 
                              selectedEnrollment.status !== 'concluded' ||
                              !selectedEnrollment.certificateUrl
                            }
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Remover
                          </Button>
                        </div>
                        {certificateForm.formState.errors.certificateUrl && (
                          <p className="text-sm text-red-500 mt-1">
                            {certificateForm.formState.errors.certificateUrl.message}
                          </p>
                        )}
                        {!isCourseFinished && (
                          <p id="certificate-help" className="text-sm text-muted-foreground mt-1">
                            O campo será habilitado quando o curso terminar
                          </p>
                        )}
                        {isCourseFinished && selectedEnrollment.status !== 'concluded' && (
                          <p id="certificate-help" className="text-sm text-muted-foreground mt-1">
                            O campo será habilitado quando a inscrição for marcada como concluída
                          </p>
                        )}
                        {isCourseFinished && selectedEnrollment.status === 'concluded' && (
                          <p id="certificate-help" className="text-sm text-muted-foreground mt-1">
                            Insira a URL do certificado de conclusão e clique em "Salvar"
                          </p>
                        )}
                        {selectedEnrollment.certificateUrl && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-800">
                              <strong>Certificado salvo:</strong>{' '}
                              <a 
                                href={selectedEnrollment.certificateUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800 underline"
                              >
                                {selectedEnrollment.certificateUrl}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
              <SheetFooter className="flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  <Button
                    onClick={() => handleConfirmEnrollment(selectedEnrollment)}
                    className="w-full bg-green-50 border border-green-200 text-green-700"
                    disabled={
                      selectedEnrollment.status === 'approved' || isCourseFinished
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar inscrição
                  </Button>
                  <Button
                    onClick={() =>
                      handleSetPendingEnrollment(selectedEnrollment)
                    }
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700"
                    disabled={
                      selectedEnrollment.status === 'pending' || isCourseFinished
                    }
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Deixar pendente
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelEnrollment(selectedEnrollment)}
                    className="w-full bg-red-50! border border-red-200 text-red-700"
                    disabled={
                      selectedEnrollment.status === 'rejected' || isCourseFinished
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Recusar inscrição
                  </Button>
                </div>
                <Button
                  onClick={() => 
                    selectedEnrollment.status === 'concluded' 
                      ? handleRemoveConcludedStatus(selectedEnrollment)
                      : handleConcludedCourse(selectedEnrollment)
                  }
                  className={`w-full ${
                    selectedEnrollment.status === 'concluded'
                      ? 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                      : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                  disabled={!isCourseFinished}
                >
                  {selectedEnrollment.status === 'concluded' ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Remover status de concluído
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marcar como concluído
                    </>
                  )}
                </Button>
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
            tooltip="Confirmar todas as inscrições selecionadas"
            onClick={handleBulkConfirmEnrollments}
            disabled={isCourseFinished}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar inscrições
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Definir todas as inscrições selecionadas como pendentes"
            onClick={handleBulkSetPending}
            disabled={isCourseFinished}
          >
            <Clock className="mr-2 h-4 w-4" />
            Definir como pendentes
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Recusar inscrições selecionadas"
            onClick={handleBulkCancelEnrollments}
            disabled={isCourseFinished}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Recusar inscrições
          </DataTableActionBarAction>
          <DataTableActionBarAction
            tooltip="Marcar todas as inscrições selecionadas como concluídas"
            onClick={handleBulkConcludeEnrollments}
            disabled={!isCourseFinished}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar como concluído
          </DataTableActionBarAction>
           <DataTableActionBarAction
            tooltip="Exportar inscrições selecionadas para CSV"
            onClick={handleDownloadSpreadsheet}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar CSV
          </DataTableActionBarAction>
        </DataTableActionBar>
      </DataTable>

      {/* Modal de confirmação para remover status de concluído */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Remover Status de Concluído"
        description={
          selectedEnrollment?.certificateUrl
            ? `Tem certeza que deseja remover o status de concluído de "${selectedEnrollment.candidateName}"? Esta ação também removerá o certificado salvo e não pode ser desfeita.`
            : `Tem certeza que deseja remover o status de concluído de "${selectedEnrollment?.candidateName}"? Esta ação não pode ser desfeita.`
        }
        confirmText="Remover Status"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (selectedEnrollment) {
            confirmRemoveConcludedStatus(selectedEnrollment)
          }
        }}
      />
    </div>
  )
}
