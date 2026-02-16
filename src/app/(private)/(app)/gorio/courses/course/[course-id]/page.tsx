'use client'

import { DuplicateCourseButton } from '@/app/(private)/(app)/gorio/components/duplicate-course-button'
import { EnrollmentsTable } from '@/app/(private)/(app)/gorio/components/enrollments-table'
import {
  NewCourseForm,
  type NewCourseFormRef,
} from '@/app/(private)/(app)/gorio/components/new-course-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDateTimeToUTC } from '@/components/ui/datetime-picker'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
import { useCourse } from '@/hooks/use-course'
import { useDepartment } from '@/hooks/use-department'
import type { CourseStatusConfig } from '@/types/course'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Ban,
  Calendar,
  ClipboardList,
  Edit,
  FileText,
  Flag,
  Play,
  Save,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Status configuration for badges - updated to match courses list page
const statusConfig: Record<string, CourseStatusConfig> = {
  draft: {
    icon: FileText,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  opened: {
    icon: ClipboardList,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  ABERTO: {
    icon: ClipboardList,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  // New dynamic statuses for opened/ABERTO courses
  scheduled: {
    icon: Calendar,
    label: 'Agendado',
    variant: 'outline',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  accepting_enrollments: {
    icon: UserCheck,
    label: 'Recebendo Inscrições',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  in_progress: {
    icon: Play,
    label: 'Em Andamento',
    variant: 'default',
    className: 'text-orange-600 border-orange-200 bg-orange-50',
  },
  finished: {
    icon: Flag,
    label: 'Encerrado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  CRIADO: {
    icon: ClipboardList,
    label: 'Criado',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  closed: {
    icon: Flag,
    label: 'Fechado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  ENCERRADO: {
    icon: Flag,
    label: 'Encerrado',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
  canceled: {
    icon: Ban,
    label: 'Cancelado',
    variant: 'secondary',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
  CANCELADO: {
    icon: Ban,
    label: 'Cancelado',
    variant: 'secondary',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
}

export default function CourseDetailPage({
  params,
}: { params: Promise<{ 'course-id': string }> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const [isLoading, setIsLoading] = useState(false)
  const [hasFormChanges, setHasFormChanges] = useState(false)
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [courseId, setCourseId] = useState<number | null>(null)

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type:
      | 'delete_draft'
      | 'save_changes'
      | 'publish_course'
      | 'cancel_course'
      | 'close_course'
      | 'reopen_course'
      | null
  }>({
    open: false,
    type: null,
  })

  // Refs to trigger form submission
  const draftFormRef = useRef<NewCourseFormRef>(null)
  const courseFormRef = useRef<NewCourseFormRef>(null)

  // Use the custom hook to fetch course data
  const { course, loading, error, refetch } = useCourse(
    courseId?.toString() || null
  )

  // Handle async params
  useEffect(() => {
    params.then(resolvedParams => {
      setCourseId(Number(resolvedParams['course-id']))
    })
  }, [params])

  // Function to update URL with tab parameter
  const updateTabInUrl = useCallback(
    (newTab: string) => {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('tab', newTab)

      // Use router.replace to update URL without adding to history
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    },
    [router]
  )

  // Auto-enable edit mode if edit=true query parameter is present
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam === 'true') {
      setIsEditing(true)
    }

    // Set active tab from URL parameter
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'about' || tabParam === 'enrollments')) {
      setActiveTab(tabParam)
    } else if (!tabParam && course && course.status !== 'draft') {
      // Set default tab for non-draft courses if no tab param exists
      updateTabInUrl('about')
    }
  }, [searchParams, course, updateTabInUrl])

  // Handler for tab change - intercept if editing with unsaved changes
  const handleTabChange = useCallback(
    (newTab: string) => {
      if (isEditing && hasFormChanges && newTab !== activeTab) {
        setPendingTab(newTab)
        setShowTabChangeDialog(true)
      } else {
        setActiveTab(newTab)
        updateTabInUrl(newTab)
      }
    },
    [isEditing, hasFormChanges, activeTab, updateTabInUrl]
  )

  const handleConfirmTabChange = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab)
      updateTabInUrl(pendingTab)
      setPendingTab(null)
    }
    setShowTabChangeDialog(false)
  }, [pendingTab, updateTabInUrl])

  const handleCancelTabChange = useCallback(() => {
    setPendingTab(null)
    setShowTabChangeDialog(false)
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
    setActiveTab('about')
    updateTabInUrl('about')
  }

  const handleSave = async (data: any) => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const updateData = {
        ...data,
        title: data.title || course?.title,
        categorias: data.categorias || course?.categorias || [],
        modalidade: data.modalidade || course?.modalidade,
        status: data.status || course?.status,
        orgao_id: data.orgao_id || course?.orgao_id,
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save course')
      }

      const result = await response.json()
      // console.log('Course saved successfully:', result)

      toast.success('Curso salvo com sucesso!')
      setIsEditing(false)

      // Refetch course data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error saving course:', error)
      toast.error('Erro ao salvar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async (data: any) => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const publishData = {
        ...data,
        title: data.title || course?.title,
        categorias: data.categorias || course?.categorias || [],
        modalidade: data.modalidade || course?.modalidade,
        status: 'opened',
        orgao_id: data.orgao_id || course?.orgao_id,
      }

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish course')
      }

      const result = await response.json()
      // console.log('Course published successfully:', result)

      toast.success('Curso publicado com sucesso!')
      setIsEditing(false)

      // Refetch course data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error publishing course:', error)
      toast.error('Erro ao publicar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelCourse = () => {
    setConfirmDialog({
      open: true,
      type: 'cancel_course',
    })
  }

  const handleCloseCourse = () => {
    setConfirmDialog({
      open: true,
      type: 'close_course',
    })
  }

  const handleReopenCourse = () => {
    setConfirmDialog({
      open: true,
      type: 'reopen_course',
    })
  }

  // Helper function to normalize date to ISO string
  const normalizeDateToISO = (date: any): string | undefined => {
    if (!date) return undefined
    if (typeof date === 'string') {
      // Already a string, check if it's a valid ISO string
      try {
        new Date(date)
        return date
      } catch {
        return undefined
      }
    }
    if (date instanceof Date) {
      return formatDateTimeToUTC(date)
    }
    return undefined
  }

  // Helper function to transform locations from frontend format to API format
  const transformLocationsToApiFormat = (locations: any[]) => {
    if (!locations || !Array.isArray(locations)) return []

    return locations
      .map(location => {
        // Frontend format (camelCase) - transform to API format
        if (location.schedules && Array.isArray(location.schedules)) {
          // Filter and transform schedules, only including those with valid start dates
          const validSchedules = location.schedules
            .map((schedule: any) => {
              const startDate =
                normalizeDateToISO(schedule.classStartDate) ||
                normalizeDateToISO(schedule.class_start_date)
              const endDate =
                normalizeDateToISO(schedule.classEndDate) ||
                normalizeDateToISO(schedule.class_end_date)

              // Only include schedule if it has a valid start date
              if (!startDate) return null

              return {
                id: schedule.id || '00000000-0000-0000-0000-000000000000',
                vacancies: schedule.vacancies,
                class_start_date: startDate,
                class_end_date: endDate,
                class_time: schedule.classTime || schedule.class_time || '',
                class_days: schedule.classDays || schedule.class_days || '',
              }
            })
            .filter((schedule: any) => schedule !== null)

          // Only include location if it has at least one valid schedule
          if (validSchedules.length === 0) return null

          return {
            id: location.id || '00000000-0000-0000-0000-000000000000',
            address: location.address,
            neighborhood: location.neighborhood,
            neighborhood_zone: location.neighborhood_zone || location.zona,
            schedules: validSchedules,
          }
        }

        // Old format without schedules - convert to new format
        const startDate =
          normalizeDateToISO(location.classStartDate) ||
          normalizeDateToISO(location.class_start_date)

        // Only include location if it has a valid start date
        if (!startDate) return null

        return {
          id: location.id || '00000000-0000-0000-0000-000000000000',
          address: location.address,
          neighborhood: location.neighborhood,
          neighborhood_zone: location.neighborhood_zone || location.zona,
          schedules: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              vacancies: location.vacancies || 1,
              class_start_date: startDate,
              class_end_date:
                normalizeDateToISO(location.classEndDate) ||
                normalizeDateToISO(location.class_end_date),
              class_time: location.classTime || location.class_time || '',
              class_days: location.classDays || location.class_days || '',
            },
          ],
        }
      })
      .filter((location: any) => location !== null) // Remove locations without valid schedules
  }

  // Helper function to transform remote_class from frontend format to API format
  const transformRemoteClassToApiFormat = (remoteClass: any) => {
    if (!remoteClass) return undefined

    // Frontend format - transform to API format
    if (remoteClass.schedules && Array.isArray(remoteClass.schedules)) {
      // Filter and transform schedules, only including those with valid start dates
      const validSchedules = remoteClass.schedules
        .map((schedule: any) => {
          const startDate =
            normalizeDateToISO(schedule.classStartDate) ||
            normalizeDateToISO(schedule.class_start_date)
          const endDate =
            normalizeDateToISO(schedule.classEndDate) ||
            normalizeDateToISO(schedule.class_end_date)

          // Only include schedule if it has a valid start date
          if (!startDate) return null

          return {
            id: schedule.id || '00000000-0000-0000-0000-000000000000',
            vacancies: schedule.vacancies,
            class_start_date: startDate,
            class_end_date: endDate,
            class_time: schedule.classTime || schedule.class_time || '',
            class_days: schedule.classDays || schedule.class_days || '',
          }
        })
        .filter((schedule: any) => schedule !== null)

      // Only return remote_class if it has at least one valid schedule
      if (validSchedules.length === 0) return undefined

      return {
        id: remoteClass.id || '00000000-0000-0000-0000-000000000000',
        schedules: validSchedules,
      }
    }

    // Old format - wrap in schedules array
    const startDate =
      normalizeDateToISO(remoteClass.classStartDate) ||
      normalizeDateToISO(remoteClass.class_start_date)

    // Only return remote_class if it has a valid start date
    if (!startDate) return undefined

    return {
      id: remoteClass.id || '00000000-0000-0000-0000-000000000000',
      schedules: [
        {
          id: remoteClass.id || '00000000-0000-0000-0000-000000000000',
          vacancies: remoteClass.vacancies || 1,
          class_start_date: startDate,
          class_end_date:
            normalizeDateToISO(remoteClass.classEndDate) ||
            normalizeDateToISO(remoteClass.class_end_date),
          class_time: remoteClass.classTime || remoteClass.class_time || '',
          class_days: remoteClass.classDays || remoteClass.class_days || '',
        },
      ],
    }
  }

  // Helper function to build complete course data for API calls
  const buildCompleteUpdateData = (statusOverride?: string) => {
    if (!course) return {}
    const instituicaoId = Number(
      process.env.NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT ?? ''
    )

    // Transform locations to API format
    const transformedLocations = transformLocationsToApiFormat(
      course.locations || []
    )

    // Transform remote_class to API format
    const transformedRemoteClass = transformRemoteClassToApiFormat(
      (course as any).remote_class
    )

    return {
      title: course.title,
      description: course.description,
      categorias: course.categorias || [],
      enrollment_start_date:
        (course as any).enrollment_start_date ||
        (course.enrollmentStartDate
          ? formatDateTimeToUTC(new Date(course.enrollmentStartDate))
          : undefined),
      enrollment_end_date:
        (course as any).enrollment_end_date ||
        (course.enrollmentEndDate
          ? formatDateTimeToUTC(new Date(course.enrollmentEndDate))
          : undefined),
      orgao_id: course.orgao_id,
      instituicao_id: instituicaoId,
      modalidade: course.modalidade,
      theme: course.theme,
      workload: course.workload,
      target_audience: course.target_audience || course.targetAudience,
      institutional_logo: course.institutional_logo || course.institutionalLogo,
      cover_image: course.cover_image || course.coverImage,
      pre_requisitos: course.pre_requisitos || course.prerequisites,
      has_certificate: course.has_certificate || course.hasCertificate,
      // External partner fields
      is_external_partner: course.is_external_partner,
      external_partner_name: course.external_partner_name,
      external_partner_url: course.external_partner_url,
      external_partner_logo_url: course.external_partner_logo_url,
      external_partner_contact: course.external_partner_contact,
      facilitator: course.facilitator,
      objectives: course.objectives,
      expected_results: course.expectedResults,
      program_content: course.programContent,
      methodology: course.methodology,
      resources_used: course.resources_used || course.resourcesUsed,
      material_used: course.material_used || course.materialUsed,
      teaching_material: course.teaching_material || course.teachingMaterial,
      custom_fields: course.custom_fields || course.customFields || [],
      // For LIVRE_FORMACAO_ONLINE, ensure formacao_link is filled with external_partner_url if empty
      formacao_link: (() => {
        const formacaoLink = (course as any).formacao_link || ''
        if (course.modalidade === 'LIVRE_FORMACAO_ONLINE') {
          // If formacao_link is empty, use external_partner_url as fallback
          if (!formacaoLink || formacaoLink.trim() === '') {
            return course.external_partner_url || ''
          }
        }
        return formacaoLink
      })(),
      locations: transformedLocations,
      remote_class: transformedRemoteClass,
      turno: 'LIVRE',
      formato_aula:
        course.modalidade === 'ONLINE' ||
        course.modalidade === 'LIVRE_FORMACAO_ONLINE'
          ? 'GRAVADO'
          : 'PRESENCIAL',
      status: statusOverride || course.status,
    }
  }

  const confirmCancelCourse = async () => {
    try {
      setIsLoading(true)

      // Build complete course data with canceled status
      const cancelData = buildCompleteUpdateData('canceled')

      // console.log(
      //   'Cancel course data to be sent:',
      //   JSON.stringify(cancelData, null, 2)
      // )

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel course')
      }

      const result = await response.json()
      console.log('Course canceled successfully:', result)

      toast.success('Curso cancelado com sucesso!')

      // Refetch course data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error canceling course:', error)
      toast.error('Erro ao cancelar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmCloseCourse = async () => {
    try {
      setIsLoading(true)

      // Build complete course data with closed status
      const closeData = buildCompleteUpdateData('closed')

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closeData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to close course')
      }

      const result = await response.json()
      console.log('Course closed successfully:', result)

      toast.success('Curso fechado com sucesso!')

      // Refetch course data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error closing course:', error)
      toast.error('Erro ao fechar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmReopenCourse = async () => {
    try {
      setIsLoading(true)

      // Build complete course data with opened status
      const reopenData = buildCompleteUpdateData('opened')

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reopenData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reopen course')
      }

      const result = await response.json()
      console.log('Course reopened successfully:', result)

      toast.success('Curso reaberto com sucesso!')

      // Refetch course data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error reopening course:', error)
      toast.error('Erro ao reabrir curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishFromHeader = () => {
    // Trigger form validation and publish
    if (isDraft) {
      draftFormRef.current?.triggerPublish()
    } else {
      courseFormRef.current?.triggerPublish()
    }
  }

  const handleSaveDraftFromHeader = () => {
    // For drafts, use triggerSaveDraft; for non-drafts, use triggerSubmit
    if (isDraft) {
      draftFormRef.current?.triggerSaveDraft()
    } else {
      courseFormRef.current?.triggerSubmit()
    }
  }

  const handleCancel = () => {
    // Reset form to initial values before disabling edit mode
    if (isDraft) {
      draftFormRef.current?.resetForm()
    } else {
      courseFormRef.current?.resetForm()
    }
    setIsEditing(false)
  }

  const handleDeleteDraft = () => {
    setConfirmDialog({
      open: true,
      type: 'delete_draft',
    })
  }

  const confirmDeleteDraft = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete draft course')
      }

      const result = await response.json()
      console.log('Draft course deleted successfully:', result)

      toast.success('Rascunho excluído com sucesso!')

      // Redirect to courses list with appropriate tab
      router.push('/gorio/courses?tab=draft')
    } catch (error) {
      console.error('Error deleting draft course:', error)
      toast.error('Erro ao excluir rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state
  if (loading || !courseId) {
    return (
      <ContentLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando curso...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Show error state
  if (error || !course) {
    return (
      <ContentLayout title="Erro">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Ban className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Erro ao carregar curso
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Curso não encontrado'}
            </p>
            <Link href="/gorio/courses">
              <Button>Voltar para Cursos</Button>
            </Link>
          </div>
        </div>
      </ContentLayout>
    )
  }

  const config =
    statusConfig[course.status as keyof typeof statusConfig] ||
    statusConfig.draft
  const StatusIcon = config.icon

  // Use originalStatus for business logic, fallback to status if originalStatus not available
  const actualStatus = course.status as string
  console.log('actualStatus', actualStatus)

  // Check if course is a draft
  const isDraft = actualStatus === 'draft'

  // Check if course can be canceled (only if status is "opened", "ABERTO", "accepting_enrollments", or "in_progress")
  const canCancel =
    actualStatus === 'opened' ||
    actualStatus === 'scheduled' ||
    actualStatus === 'ABERTO' ||
    actualStatus === 'accepting_enrollments' ||
    actualStatus === 'in_progress'

  // Check if course can be closed (only if status is "opened" or "ABERTO")
  const canClose = actualStatus === 'opened' || actualStatus === 'ABERTO'

  // Check if course can be reopened (only if status is "closed" or "canceled")
  const canReopen = actualStatus === 'closed' || actualStatus === 'canceled'

  // Debug logging for canReopen
  console.log('canReopen calculation:', {
    actualStatus,
    isClosed: actualStatus === 'closed',
    isCanceled: actualStatus === 'canceled',
    canReopen,
  })

  return (
    <ContentLayout title="Detalhes do Curso">
      <UnsavedChangesGuard
        hasUnsavedChanges={isEditing && hasFormChanges}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>GO Rio</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/courses">Cursos</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{course.title as string}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between md:flex-row flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {course.title as string}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge
                  variant={config.variant}
                  className={`capitalize ${config.className}`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Criado em{' '}
                  {format(
                    new Date(course.created_at) || new Date(),
                    'dd/MM/yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Show action buttons based on course status */}
              {!isEditing ? (
                <>
                  {/* Duplicate Course button */}
                  <DuplicateCourseButton course={course} disabled={isLoading} />
                  {/* Edit button - don't show for closed, canceled, finished, or encerrado courses when not in enrollments tab */}
                  {actualStatus !== 'closed' &&
                    actualStatus !== 'canceled' &&
                    // actualStatus !== 'finished' &&
                    actualStatus !== 'ENCERRADO' && (
                      <Button
                        onClick={handleEdit}
                        disabled={activeTab === 'enrollments' || isLoading}
                        className="w-full md:w-auto"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}

                  {/* Reopen Course button - only show if status is "closed" or "canceled" */}
                  {canReopen && (
                    <Button
                      variant="outline"
                      onClick={handleReopenCourse}
                      disabled={isLoading}
                      className="w-full md:w-auto"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Reabrir Curso
                    </Button>
                  )}

                  {/* Close Course button - only show if status is "opened" or "ABERTO" */}
                  {canClose && (
                    <Button
                      variant="outline"
                      onClick={handleCloseCourse}
                      disabled={isLoading}
                      className="w-full md:w-auto"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Fechar Curso
                    </Button>
                  )}

                  {/* Cancel Course button - only show if status is "opened", "ABERTO", "accepting_enrollments", or "in_progress" */}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelCourse}
                      disabled={isLoading}
                      className="w-full md:w-auto"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Cancelar Curso
                    </Button>
                  )}

                  {/* Delete Draft button - only show for draft courses */}
                  {isDraft && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteDraft}
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir rascunho
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {isDraft && (
                    <Button
                      onClick={handlePublishFromHeader}
                      disabled={isLoading}
                      className="w-full md:w-auto"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salvar e Publicar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleSaveDraftFromHeader}
                    disabled={isLoading}
                    className="w-full md:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isDraft ? 'Salvar Rascunho' : 'Salvar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="w-full md:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Conditional rendering based on course status */}
        {isDraft ? (
          // For draft courses, show only the form without tabs
          <div className="mt-6">
            <div className={isEditing ? '' : 'pointer-events-none opacity-90'}>
              <NewCourseForm
                ref={draftFormRef}
                initialData={course as any}
                isReadOnly={!isEditing}
                onSubmit={handleSave}
                onPublish={handlePublish}
                isDraft={isDraft}
                courseStatus={course.status as string}
                onFormChangesDetected={setHasFormChanges}
              />
            </div>
          </div>
        ) : (
          // For non-draft courses, show tabs
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="about" disabled={isEditing && hasFormChanges}>
                Sobre o curso
              </TabsTrigger>
              <TabsTrigger
                value="enrollments"
                disabled={isEditing || (isEditing && hasFormChanges)}
              >
                <Users className="w-4 h-4 mr-2" />
                Inscrições
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              {/* Course Form */}
              <div
                className={isEditing ? '' : 'pointer-events-none opacity-90'}
              >
                <NewCourseForm
                  ref={courseFormRef}
                  initialData={course as any}
                  isReadOnly={!isEditing}
                  onSubmit={handleSave}
                  onPublish={handlePublish}
                  isDraft={isDraft}
                  courseStatus={course.status as string}
                  onFormChangesDetected={setHasFormChanges}
                />
              </div>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <EnrollmentsTable
                courseId={courseId?.toString() || ''}
                courseTitle={course?.title as string}
                course={{
                  has_certificate: course?.has_certificate as
                    | boolean
                    | undefined,
                  locations: (course as any)?.locations as
                    | Array<{ class_end_date?: string }>
                    | undefined,
                  remote_class: (course as any)?.remote_class as
                    | { class_end_date?: string }
                    | undefined,
                  modalidade: course?.modalidade as string | undefined,
                  status: course?.status as string | undefined,
                  custom_fields: course?.custom_fields,
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title={
          confirmDialog.type === 'delete_draft'
            ? 'Excluir Rascunho'
            : confirmDialog.type === 'save_changes'
              ? 'Salvar Alterações'
              : confirmDialog.type === 'publish_course'
                ? 'Publicar Curso'
                : confirmDialog.type === 'cancel_course'
                  ? 'Cancelar Curso'
                  : confirmDialog.type === 'close_course'
                    ? 'Fechar Curso'
                    : confirmDialog.type === 'reopen_course'
                      ? 'Reabrir Curso'
                      : 'Confirmar Ação'
        }
        description={
          confirmDialog.type === 'delete_draft'
            ? `Tem certeza que deseja excluir o rascunho "${course.title}"? Esta ação não pode ser desfeita.`
            : confirmDialog.type === 'save_changes'
              ? `Tem certeza que deseja salvar as alterações no curso "${course.title}"?`
              : confirmDialog.type === 'publish_course'
                ? `Tem certeza que deseja publicar o curso "${course.title}"? Esta ação tornará o curso visível para inscrições.`
                : confirmDialog.type === 'cancel_course'
                  ? `Tem certeza que deseja cancelar o curso "${course.title}"? O curso não estará mais disponível para inscrições.`
                  : confirmDialog.type === 'close_course'
                    ? `Tem certeza que deseja fechar o curso "${course.title}"? Esta ação encerrará o período de inscrições e o curso não receberá mais candidatos.`
                    : confirmDialog.type === 'reopen_course'
                      ? `Tem certeza que deseja reabrir o curso "${course.title}"? Esta ação permitirá que o curso volte a receber inscrições.`
                      : 'Tem certeza que deseja realizar esta ação?'
        }
        confirmText={
          confirmDialog.type === 'delete_draft'
            ? 'Excluir Rascunho'
            : confirmDialog.type === 'save_changes'
              ? 'Salvar Alterações'
              : confirmDialog.type === 'publish_course'
                ? 'Publicar Curso'
                : confirmDialog.type === 'cancel_course'
                  ? 'Cancelar Curso'
                  : confirmDialog.type === 'close_course'
                    ? 'Fechar Curso'
                    : confirmDialog.type === 'reopen_course'
                      ? 'Reabrir Curso'
                      : 'Confirmar'
        }
        variant={
          confirmDialog.type === 'delete_draft' ||
          confirmDialog.type === 'cancel_course'
            ? 'destructive'
            : 'default'
        }
        onConfirm={() => {
          if (confirmDialog.type === 'delete_draft') {
            confirmDeleteDraft()
          } else if (confirmDialog.type === 'save_changes') {
            // Trigger form submission
            if (isDraft) {
              draftFormRef.current?.triggerSubmit()
            } else {
              courseFormRef.current?.triggerSubmit()
            }
          } else if (confirmDialog.type === 'publish_course') {
            // Trigger form publication
            if (isDraft) {
              draftFormRef.current?.triggerPublish()
            } else {
              courseFormRef.current?.triggerPublish()
            }
          } else if (confirmDialog.type === 'cancel_course') {
            confirmCancelCourse()
          } else if (confirmDialog.type === 'close_course') {
            confirmCloseCourse()
          } else if (confirmDialog.type === 'reopen_course') {
            confirmReopenCourse()
          }
        }}
      />

      {/* Modal de confirmação para mudança de tab */}
      <ConfirmDialog
        open={showTabChangeDialog}
        onOpenChange={setShowTabChangeDialog}
        title="Alterações não salvas"
        description="Você tem alterações não salvas. Tem certeza que deseja mudar de aba? As alterações serão perdidas."
        confirmText="Mudar de aba"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmTabChange}
        onCancel={handleCancelTabChange}
      />
    </ContentLayout>
  )
}
