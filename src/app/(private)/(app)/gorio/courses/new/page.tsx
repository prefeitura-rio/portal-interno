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
import { toast } from 'sonner'

import Link from 'next/link'

export default function NewCourse() {
  const handleCreateCourse = async (data: any) => {
    try {
      console.log('Creating course:', data)

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

      // Show success toast and redirect
      toast.success('Curso criado com sucesso!')
      setTimeout(() => {
        window.location.href = '/gorio/courses'
      }, 1500)
    } catch (error) {
      console.error('Error creating course:', error)
      // You might want to show an error toast here
    }
  }

  const handleCreateDraft = async (data: any) => {
    try {
      console.log('Creating draft course:', data)

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

      // Show success toast and redirect
      toast.success('Rascunho salvo com sucesso!')
      setTimeout(() => {
        window.location.href = '/gorio/courses'
      }, 1500)
    } catch (error) {
      console.error('Error creating draft course:', error)
      // You might want to show an error toast here
    }
  }

  return (
    <ContentLayout title="Gestão de Cursos">
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
        />
      </div>

      {/* Note: Confirm dialogs are handled within the NewCourseForm component */}
    </ContentLayout>
  )
}
