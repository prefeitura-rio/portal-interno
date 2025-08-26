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
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Status configuration for badges - updated to match actual API response
const statusConfig: Record<string, CourseStatusConfig> = {
  draft: {
    icon: AlertCircle,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  opened: {
    icon: CheckCircle,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  ABERTO: {
    icon: CheckCircle,
    label: 'Aberto',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  CRIADO: {
    icon: AlertCircle,
    label: 'Criado',
    variant: 'outline',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  closed: {
    icon: XCircle,
    label: 'Fechado',
    variant: 'secondary',
    className: 'text-gray-600 border-gray-200 bg-gray-50',
  },
  ENCERRADO: {
    icon: XCircle,
    label: 'Encerrado',
    variant: 'secondary',
    className: 'text-gray-600 border-gray-200 bg-gray-50',
  },
  canceled: {
    icon: XCircle,
    label: 'Cancelado',
    variant: 'destructive',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
}

export default function CourseDetailPage({
  params,
}: { params: Promise<{ 'course-id': string }> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const searchParams = useSearchParams()
  const [courseId, setCourseId] = useState<string | null>(null)

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'delete_draft' | 'save_changes' | 'publish_course' | null
  }>({
    open: false,
    type: null,
  })

  // Refs to trigger form submission
  const draftFormRef = useRef<NewCourseFormRef>(null)
  const courseFormRef = useRef<NewCourseFormRef>(null)

  // Use the custom hook to fetch course data
  const { course, loading, error } = useCourse(courseId)

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
      setCourseId(resolvedParams['course-id'])
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

  const handleSave = (data: any) => {
    setConfirmDialog({
      open: true,
      type: 'save_changes',
    })
  }

  const confirmSaveChanges = (data: any) => {
    // TODO: Implement save logic
    console.log('Saving course data:', data)
    setIsEditing(false)
    toast.success('Curso salvo com sucesso!')
  }

  const handlePublish = (data: any) => {
    setConfirmDialog({
      open: true,
      type: 'publish_course',
    })
  }

  const confirmPublishCourse = (data: any) => {
    // TODO: Implement publish logic
    console.log('Publishing course data:', data)
    setIsEditing(false)
    toast.success('Curso publicado com sucesso!')
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

  const confirmDeleteDraft = () => {
    // TODO: Implement delete draft logic
    console.log('Deleting draft course:', courseId)
    toast.success('Rascunho excluído com sucesso!')
    // Redirect to courses list
    window.location.href = '/gorio/courses'
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
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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

  // Check if course is a draft
  const isDraft = course.status === 'draft'

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
              {/* Only show action buttons if course is not canceled, closed, or encerrado */}
              {course.status !== 'canceled' &&
                course.status !== 'closed' &&
                course.status !== 'ENCERRADO' &&
                (!isEditing ? (
                  <>
                    <Button
                      onClick={handleEdit}
                      disabled={activeTab === 'enrollments'}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
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
                      <Button onClick={handlePublishFromHeader}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar e Publicar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleSaveDraftFromHeader}
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
                onSubmit={confirmSaveChanges}
                onPublish={confirmPublishCourse}
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
                  onSubmit={confirmSaveChanges}
                  onPublish={confirmPublishCourse}
                  isDraft={isDraft}
                  courseStatus={course.status}
                />
              </div>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <EnrollmentsTable
                courseId={courseId || ''}
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
              : 'Publicar Curso'
        }
        description={
          confirmDialog.type === 'delete_draft'
            ? `Tem certeza que deseja excluir o rascunho "${course.title}"? Esta ação não pode ser desfeita.`
            : confirmDialog.type === 'save_changes'
              ? `Tem certeza que deseja salvar as alterações no curso "${course.title}"?`
              : `Tem certeza que deseja publicar o curso "${course.title}"? Esta ação tornará o curso visível para inscrições.`
        }
        confirmText={
          confirmDialog.type === 'delete_draft'
            ? 'Excluir Rascunho'
            : confirmDialog.type === 'save_changes'
              ? 'Salvar Alterações'
              : 'Publicar Curso'
        }
        variant={
          confirmDialog.type === 'delete_draft' ? 'destructive' : 'default'
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
          }
        }}
      />
    </ContentLayout>
  )
}
