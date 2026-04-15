'use client'

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
import Link from 'next/link'
import { useState } from 'react'
import { NewServiceForm } from '../../components/new-service-form'

export default function NewServicePage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFormChangesDetected = (hasChanges: boolean) => {
    // Don't update if we're currently submitting
    if (!isSubmitting) {
      setHasUnsavedChanges(hasChanges)
    }
  }

  return (
    <ContentLayout title="Gestão de Serviços Municipais">
      <UnsavedChangesGuard
        hasUnsavedChanges={hasUnsavedChanges}
        allowNavigation={isSubmitting}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Serviços Municipais</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/servicos-municipais/servicos">Serviços</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Novo serviço</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novo serviço</h2>
            <p className="text-muted-foreground">
              Crie um novo serviço municipal
            </p>
          </div>
        </div>

        <NewServiceForm
          onFormChangesDetected={handleFormChangesDetected}
          onSubmittingChange={setIsSubmitting}
        />
      </div>
    </ContentLayout>
  )
}
