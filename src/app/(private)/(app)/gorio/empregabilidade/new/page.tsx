'use client'

import { NewEmpregabilidadeForm } from '@/app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form'
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
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewEmpregabilidadePage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleCreateVaga = async (data: any) => {
    try {
      console.log('Creating vaga:', data)

      // Mark as submitting to prevent guard from blocking
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      // Map form data to API expected format
      const {
        contratante,
        regime_contratacao,
        modelo_trabalho,
        tipo_pcd,
        ...rest
      } = data

      const apiData = {
        ...rest,
        id_contratante: contratante,
        id_regime_contratacao: regime_contratacao,
        id_modelo_trabalho: modelo_trabalho,
        tipos_pcd: tipo_pcd,
      }

      console.log('Mapped API data:', apiData)

      const response = await fetch('/api/empregabilidade/vagas/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create vaga')
      }

      const result = await response.json()
      console.log('Vaga created successfully:', result)

      // Show success toast and redirect to vagas list
      toast.success('Vaga criada com sucesso!')
      router.push('/gorio/empregabilidade?tab=created')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating vaga:', error)
      toast.error('Erro ao criar vaga', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      // If there's an error, re-enable the guard
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  const handleCreateDraft = async (data: any) => {
    try {
      console.log('Saving draft:', data)

      // Mark as submitting to prevent guard from blocking
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      // Map form data to API expected format
      const {
        contratante,
        regime_contratacao,
        modelo_trabalho,
        tipo_pcd,
        ...rest
      } = data

      const apiData = {
        ...rest,
        id_contratante: contratante,
        id_regime_contratacao: regime_contratacao,
        id_modelo_trabalho: modelo_trabalho,
        tipos_pcd: tipo_pcd,
      }

      console.log('Mapped draft API data:', apiData)

      const response = await fetch('/api/empregabilidade/vagas/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create draft vaga')
      }

      const result = await response.json()
      console.log('Draft vaga created successfully:', result)

      // Show success toast and redirect to vagas with 'draft' tab
      toast.success('Rascunho salvo com sucesso!')
      router.push('/gorio/empregabilidade?tab=draft')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating draft vaga:', error)
      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
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
