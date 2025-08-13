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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import { useState } from 'react'

export default function NewCourse() {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'create_course' | null
  }>({
    open: false,
    type: null,
  })

  const handleCreateCourse = (data: any) => {
    setConfirmDialog({
      open: true,
      type: 'create_course',
    })
  }

  const confirmCreateCourse = (data: any) => {
    // TODO: Implement create course logic
    console.log('Creating course:', data)
    // Redirect to courses list
    window.location.href = '/gorio/courses'
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
        <NewCourseForm onSubmit={handleCreateCourse} />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Criar Curso"
        description="Tem certeza que deseja criar este curso? Esta ação tornará o curso visível para inscrições."
        confirmText="Criar Curso"
        variant="default"
        onConfirm={() => {
          // TODO: Get form data and create course
          confirmCreateCourse({})
        }}
      />
    </ContentLayout>
  )
}
