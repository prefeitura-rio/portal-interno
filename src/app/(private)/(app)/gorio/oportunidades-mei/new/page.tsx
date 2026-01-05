'use client'
import { NewMEIOpportunityForm } from '@/app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form'
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
import { useCreateMEIOpportunity } from '@/hooks/use-create-mei-opportunity'
import { useState } from 'react'

import Link from 'next/link'

export default function NewMEIOpportunity() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createOpportunity, createDraft } = useCreateMEIOpportunity()

  const handleCreateOpportunity = async (data: any) => {
    // Mark as submitting to prevent guard from blocking
    setIsSubmitting(true)
    setHasUnsavedChanges(false)

    try {
      await createOpportunity(data)
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
      await createDraft(data)
    } catch (error) {
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  return (
    <ContentLayout title="Gestão de Oportunidades MEI">
      <UnsavedChangesGuard
        hasUnsavedChanges={hasUnsavedChanges && !isSubmitting}
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
                  <Link href="/gorio/oportunidades-mei">Oportunidades MEI</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Nova Oportunidade</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Nova Oportunidade MEI
            </h2>
            <p className="text-muted-foreground">
              Crie uma nova oportunidade MEI.
            </p>
          </div>
        </div>
        <NewMEIOpportunityForm
          onSubmit={handleCreateOpportunity}
          onSaveDraft={handleCreateDraft}
          onFormChangesDetected={setHasUnsavedChanges}
        />
      </div>
    </ContentLayout>
  )
}
