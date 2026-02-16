'use client'
import { NewCourseForm } from '@/app/(private)/(app)/gorio/components/new-course-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import Link from 'next/link'

export default function NewCourse() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleCreateCourse = async (data: any) => {
    try {
      console.log('Creating course:', data)

      // Mark as submitting to prevent guard from blocking
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      const response = await fetch('/api/courses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create course')
      }

      const result = await response.json()
      console.log('Course created successfully:', result)

      // Show success toast and redirect to courses with 'created' tab
      toast.success('Curso criado com sucesso!')
      router.push('/gorio/courses?tab=created')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Erro ao criar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  const handleCreateDraft = async (data: any) => {
    try {
      console.log('Creating draft course:', data)

      // Mark as submitting to prevent guard from blocking
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      const response = await fetch('/api/courses/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create draft course')
      }

      const result = await response.json()
      console.log('Draft course created successfully:', result)

      // Show success toast and redirect to courses with 'draft' tab
      toast.success('Rascunho salvo com sucesso!')
      router.push('/gorio/courses?tab=draft')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating draft course:', error)
      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  return (
    <ContentLayout title="Gestão de Cursos">
      <UnsavedChangesGuard
        hasUnsavedChanges={hasUnsavedChanges}
        allowNavigation={isSubmitting}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />
      <div className="space-y-4">
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
                <BreadcrumbPage>Novo Curso</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novo Curso</h2>
            <p className="text-muted-foreground">Crie um novo curso.</p>
          </div>
        </div>
        <NewCourseForm
          onSubmit={handleCreateCourse}
          onSaveDraft={handleCreateDraft}
          onFormChangesDetected={setHasUnsavedChanges}
        />
      </div>

      {/* Note: Confirm dialogs are handled within the NewCourseForm component */}
    </ContentLayout>
  )
}
