'use client'

import { EnrollmentsTable } from '@/app/(private)/gorio/components/enrollments-table'
import { NewCourseForm } from '@/app/(private)/gorio/components/new-course-form'
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
  Users,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Status configuration for badges
const statusConfig: Record<string, CourseStatusConfig> = {
  active: {
    icon: CheckCircle,
    label: 'Ativo',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  inactive: {
    icon: XCircle,
    label: 'Inativo',
    variant: 'secondary',
    className: 'text-gray-600 border-gray-200 bg-gray-50',
  },
  draft: {
    icon: AlertCircle,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  completed: {
    icon: CheckCircle,
    label: 'Concluído',
    variant: 'outline',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  receiving_registrations: {
    icon: CheckCircle,
    label: 'Recebendo Inscrições',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  in_progress: {
    icon: CheckCircle,
    label: 'Em Andamento',
    variant: 'default',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  finished: {
    icon: CheckCircle,
    label: 'Finalizado',
    variant: 'outline',
    className: 'text-gray-600 border-gray-200 bg-gray-50',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelado',
    variant: 'secondary',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
  scheduled: {
    icon: AlertCircle,
    label: 'Agendado',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
}

export default function CourseDetailPage({
  params,
}: { params: Promise<{ 'course-id': string }> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const searchParams = useSearchParams()
  const [courseId, setCourseId] = useState<string | null>(null)

  // Use the custom hook to fetch course data
  const { course, loading, error } = useCourse(courseId)

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
    // TODO: Implement save logic
    console.log('Saving course data:', data)
    setIsEditing(false)
    toast.success('Curso salvo com sucesso!')
  }

  const handlePublish = (data: any) => {
    // TODO: Implement publish logic
    console.log('Publishing course data:', data)
    setIsEditing(false)
    toast.success('Curso publicado com sucesso!')
  }

  const handlePublishFromHeader = () => {
    // Chama a função handlePublish do formulário com status correto
    if (course) {
      const publishData = {
        ...course,
        status: 'opened' as const,
      }
      handlePublish(publishData)
    }
  }

  const handleSaveDraftFromHeader = () => {
    // Chama a função handleSave com status de rascunho
    if (course) {
      const draftData = {
        ...course,
        status: 'draft' as const,
      }
      handleSave(draftData)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
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
              {!isEditing ? (
                <Button
                  onClick={handleEdit}
                  disabled={activeTab === 'enrollments'}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  {isDraft && (
                    <Button onClick={handlePublishFromHeader}>
                      <Save className="mr-2 h-4 w-4" />
                      Publicar
                    </Button>
                  )}
                  <Button
                    onClick={
                      isDraft
                        ? handleSaveDraftFromHeader
                        : () => handleSave(course)
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isDraft ? 'Salvar Rascunho' : 'Salvar'}
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
                initialData={course as any}
                isReadOnly={!isEditing}
                onSubmit={handleSave}
                onPublish={handlePublish}
                isDraft={isDraft}
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
                  initialData={course as any}
                  isReadOnly={!isEditing}
                  onSubmit={handleSave}
                  onPublish={handlePublish}
                  isDraft={isDraft}
                />
              </div>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <EnrollmentsTable courseId={courseId || ''} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ContentLayout>
  )
}
