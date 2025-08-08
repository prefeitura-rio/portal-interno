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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// Mock data for the course
const mockCourse = {
  title: 'Desenvolvimento Web Frontend com React',
  description:
    'Curso completo de desenvolvimento web frontend utilizando React, TypeScript e modernas práticas de desenvolvimento. Aprenda a criar aplicações web responsivas e interativas.',
  organization: 'org1',
  modalidade: 'Presencial' as const,
  enrollmentStartDate: new Date('2025-08-01'),
  enrollmentEndDate: new Date('2025-08-31'),
  workload: '40 horas',
  targetAudience:
    'Desenvolvedores iniciantes e intermediários, estudantes de tecnologia, profissionais que desejam migrar para desenvolvimento web.',
  prerequisites:
    'Conhecimento básico em HTML, CSS e JavaScript. Ensino médio completo.',
  hasCertificate: true,
  facilitator: 'João Silva',
  objectives:
    'Desenvolver habilidades em React, TypeScript e desenvolvimento web moderno. Capacitar para criação de aplicações web profissionais.',
  expectedResults:
    'Ao final do curso, os participantes estarão aptos a criar aplicações web completas usando React e TypeScript.',
  programContent:
    'Módulo 1: Introdução ao React\nMódulo 2: Componentes e Props\nMódulo 3: Estado e Ciclo de Vida\nMódulo 4: Hooks\nMódulo 5: Roteamento\nMódulo 6: Integração com APIs',
  methodology:
    'Aulas expositivas, exercícios práticos, projetos em grupo, estudos de caso.',
  resourcesUsed: 'Computadores, projetor, ambiente de desenvolvimento online.',
  materialUsed: 'Slides, apostilas digitais, vídeos complementares.',
  teachingMaterial:
    'Documentação oficial do React, artigos técnicos, exercícios práticos.',
  locations: [
    {
      address: 'Rua das Flores, 123 - Centro',
      neighborhood: 'Centro',
      vacancies: 25,
      classStartDate: new Date('2025-09-01'),
      classEndDate: new Date('2025-10-30'),
      classTime: '19:00 - 22:00',
      classDays: 'Segunda, Quarta, Sexta',
    },
  ],
  institutionalLogo: null,
  coverImage: null,
  customFields: [],
}

// Additional course metadata for display purposes
const courseMetadata = {
  id: '1',
  status: 'active' as const,
  created_at: new Date('2025-07-30T10:00:00Z'),
}

const statusConfig = {
  active: {
    icon: CheckCircle,
    label: 'Ativo',
    variant: 'default' as const,
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  inactive: {
    icon: XCircle,
    label: 'Inativo',
    variant: 'secondary' as const,
    className: 'text-gray-600 border-gray-200 bg-gray-50',
  },
  draft: {
    icon: AlertCircle,
    label: 'Rascunho',
    variant: 'outline' as const,
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  completed: {
    icon: CheckCircle,
    label: 'Concluído',
    variant: 'outline' as const,
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
}

export default function CourseDetailPage({
  params,
}: { params: Promise<{ 'course-id': string }> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const searchParams = useSearchParams()
  const [courseId, setCourseId] = useState<string | null>(null)
  const course = mockCourse // In a real app, you'd fetch this based on courseId
  const metadata = courseMetadata

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
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const config = statusConfig[metadata.status]
  const StatusIcon = config.icon

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
                  {format(metadata.created_at, 'dd/MM/yyyy', { locale: ptBR })}
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
                  <Button onClick={() => handleSave(course)}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="about">Sobre o curso</TabsTrigger>
            <TabsTrigger value="enrollments" disabled={isEditing}>
              <Users className="w-4 h-4 mr-2" />
              Inscrições
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            {/* Course Form */}
            <div className={isEditing ? '' : 'pointer-events-none opacity-90'}>
              <NewCourseForm
                initialData={course as any}
                isReadOnly={!isEditing}
                onSubmit={handleSave}
              />
            </div>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-6">
            <EnrollmentsTable />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
