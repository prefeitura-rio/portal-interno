'use client'

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
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCourse } from '@/hooks/use-course'
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
import { useEffect, useRef, useState } from 'react'
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

  // Debug logging
  useEffect(() => {
    if (course) {
      console.log('Course data received:', course)
      console.log('Course status:', course.status)
    }
  }, [course])

  // Handle async params
  useEffect(() => {
    params.then(resolvedParams => {
      setCourseId(Number(resolvedParams['course-id']))
    })
  }, [params])

  // Auto-enable edit mode if edit=true query parameter is present
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam === 'true') {
      setIsEditing(true)
    }
  }, [searchParams])

  const handleEdit = () => {
    setIsEditing(true)
    setActiveTab('about')
  }

  const handleSave = async (data: any) => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const updateData = {
        ...data,
        title: data.title || course?.title,
        modalidade: data.modalidade || course?.modalidade,
        status: data.status || course?.originalStatus || course?.status,
        // Ensure organization is synced with orgao.nome
        organization:
          data.orgao?.nome || data.organization || course?.organization,
        orgao_id: data.orgao?.id || data.orgao_id || course?.orgao?.id,
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
      console.log('Course saved successfully:', result)

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
        modalidade: data.modalidade || course?.modalidade,
        status: 'opened',
        // Ensure organization is synced with orgao.nome
        organization:
          data.orgao?.nome || data.organization || course?.organization,
        orgao_id: data.orgao?.id || data.orgao_id || course?.orgao?.id,
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
      console.log('Course published successfully:', result)

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

  const confirmCancelCourse = async () => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const cancelData = {
        title: course?.title,
        orgao_id: course?.orgao?.id,
        instituicao_id: 5,
        modalidade: course?.modalidade,
        status: 'canceled',
      }

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

      // Ensure required fields are always included
      const closeData = {
        title: course?.title,
        orgao_id: course?.orgao?.id,
        instituicao_id: 5,
        modalidade: course?.modalidade,
        status: 'closed',
      }

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

      // Ensure required fields are always included
      const reopenData = {
        title: course?.title,
        orgao_id: course?.orgao?.id,
        instituicao_id: 5,
        modalidade: course?.modalidade,
        status: 'opened',
      }

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
    // Trigger form validation and save draft
    if (isDraft) {
      draftFormRef.current?.triggerSubmit()
    } else {
      courseFormRef.current?.triggerSubmit()
    }
  }

  const handleCancel = () => {
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

      // Redirect to courses list
      router.push('/gorio/courses')
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

  const config = statusConfig[course.status] || statusConfig.draft
  const StatusIcon = config.icon

  // Use originalStatus for business logic, fallback to status if originalStatus not available
  const actualStatus = course.originalStatus || course.status

  // Check if course is a draft
  const isDraft = actualStatus === 'draft'

  // Check if course can be canceled (only if status is "opened" or "ABERTO")
  const canCancel = actualStatus === 'opened' || actualStatus === 'ABERTO'

  // Check if course can be closed (only if status is "opened" or "ABERTO")
  const canClose = actualStatus === 'opened' || actualStatus === 'ABERTO'

  // Check if course can be reopened (only if status is "closed")
  const canReopen = actualStatus === 'closed'

  return (
    <ContentLayout title="Detalhes do Curso">
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
                <BreadcrumbPage>{course.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {course.title}
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
                  {format(course.created_at, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Only show action buttons if course is not canceled or encerrado */}
              {actualStatus !== 'canceled' &&
                actualStatus !== 'ENCERRADO' &&
                (!isEditing ? (
                  <>
                    {/* Edit button - don't show for closed courses when not in enrollments tab */}
                    {actualStatus !== 'closed' && (
                      <Button
                        onClick={handleEdit}
                        disabled={activeTab === 'enrollments' || isLoading}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}

                    {/* Reopen Course button - only show if status is "closed" */}
                    {canReopen && (
                      <Button
                        variant="outline"
                        onClick={handleReopenCourse}
                        disabled={isLoading}
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
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        Fechar Curso
                      </Button>
                    )}

                    {/* Cancel Course button - only show if status is "opened" or "ABERTO" */}
                    {canCancel && (
                      <Button
                        variant="destructive"
                        onClick={handleCancelCourse}
                        disabled={isLoading}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Cancelar Curso
                      </Button>
                    )}

                    {isDraft && (
                      <Button variant="destructive" onClick={handleDeleteDraft}>
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
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Salvar e Publicar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleSaveDraftFromHeader}
                      disabled={isLoading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isDraft ? 'Salvar Rascunho' : 'Salvar'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                ))}
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
                courseStatus={course.status}
              />
            </div>
          </div>
        ) : (
          // For non-draft courses, show tabs
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="about">Sobre o curso</TabsTrigger>
              <TabsTrigger value="enrollments" disabled={isEditing}>
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
                  courseStatus={course.status}
                />
              </div>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <EnrollmentsTable
                courseId={courseId?.toString() || ''}
                courseTitle={course?.title}
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
                  ? `Tem certeza que deseja cancelar o curso "${course.title}"? Esta ação não pode ser desfeita e o curso não estará mais disponível para inscrições.`
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
    </ContentLayout>
  )
}
