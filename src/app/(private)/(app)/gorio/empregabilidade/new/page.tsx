'use client'

import { NewEmpregabilidadeForm } from '@/app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useState } from 'react'
import Link from 'next/link'

export default function NewEmpregabilidadePage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateVaga = async (data: any) => {
    // Mark as submitting to prevent guard from blocking
    setIsSubmitting(true)
    setHasUnsavedChanges(false)

    try {
      // TODO: Implement API call to create vaga
      console.log('Creating vaga:', data)
    } catch (error) {
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  const handleCreateDraft = async (data: any) => {
    // Mark as submitting to prevent guard from blocking
    setIsSubmitting(true)
    setHasUnsavedChanges(false)

    try {
      // TODO: Implement API call to create draft
      console.log('Saving draft:', data)
    } catch (error) {
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  return (
    <ContentLayout title="Gestão de Vagas de Empregos">
      <UnsavedChangesGuard
        hasUnsavedChanges={hasUnsavedChanges}
        allowNavigation={isSubmitting}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade">Vagas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Nova vaga</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Nova Vaga de Empregos
            </h2>
            <p className="text-muted-foreground">
              Crie uma nova vaga de empregos
            </p>
          </div>
        </div>
        <NewEmpregabilidadeForm
          onSubmit={handleCreateVaga}
          onSaveDraft={handleCreateDraft}
          onFormChangesDetected={setHasUnsavedChanges}
        />
      </div>
    </ContentLayout>
  )
}
