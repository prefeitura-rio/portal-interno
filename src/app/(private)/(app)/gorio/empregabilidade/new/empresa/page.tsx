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
import { useState } from 'react'
import Link from 'next/link'
import { NewEmpresaForm } from './components/new-empresa-form'

export default function NewEmpresaPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateEmpresa = async (data: any) => {
    // Mark as submitting to prevent guard from blocking
    setIsSubmitting(true)
    setHasUnsavedChanges(false)

    try {
      // TODO: Implement API call to create empresa
      console.log('Creating empresa:', data)
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
                <BreadcrumbPage>Nova empresa</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Nova empresa</h2>
            <p className="text-muted-foreground">
              Cadastre uma nova empresa no sistema
            </p>
          </div>
        </div>
        <NewEmpresaForm
          onSubmit={handleCreateEmpresa}
          onFormChangesDetected={setHasUnsavedChanges}
        />
      </div>
    </ContentLayout>
  )
}
