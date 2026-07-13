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

function mapCriteriosToApiData(data: any) {
  const {
    contratante,
    regime_contratacao,
    modelo_trabalho,
    tipo_pcd,
    vaga_pcd,
    acessibilidade_pcd,
    idade_minima_ativa,
    id_escolaridade_minima,
    idiomas_requisito: _idiomas,
    ...rest
  } = data

  const tiposPcdForApi =
    (tipo_pcd?.length ?? 0) > 0
      ? (tipo_pcd ?? []).map((id: string) => ({ id }))
      : undefined

  return {
    apiData: {
      ...rest,
      id_contratante: contratante,
      id_regime_contratacao: regime_contratacao,
      id_modelo_trabalho: modelo_trabalho,
      acessibilidade_pcd: vaga_pcd ? acessibilidade_pcd : undefined,
      tipos_pcd: tiposPcdForApi,
      idade_minima: idade_minima_ativa ? 18 : null,
      id_escolaridade_minima: id_escolaridade_minima ?? null,
    },
    idiomasRequisito: (data.idiomas_requisito ?? []) as {
      id_idioma: string
      id_nivel_minimo: string
    }[],
  }
}

async function saveIdiomasRequisito(
  vagaId: string,
  idiomas: { id_idioma: string; id_nivel_minimo: string }[]
) {
  await fetch(`/api/empregabilidade/vagas/${vagaId}/idiomas-requisito`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requisitos: idiomas.map(item => ({
        id_vaga: vagaId,
        id_idioma: item.id_idioma,
        id_nivel_minimo: item.id_nivel_minimo,
      })),
    }),
  })
}

export default function NewEmpregabilidadePage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleCreateVaga = async (data: any) => {
    try {
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      const { apiData, idiomasRequisito } = mapCriteriosToApiData(data)

      const response = await fetch('/api/empregabilidade/vagas/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = 'Falha ao criar vaga'
        let errorDescription = undefined
        if (errorData.error && typeof errorData.error === 'string') {
          const fieldPattern = /(titulo|descricao|contratante|regime|modelo)/i
          if (fieldPattern.test(errorData.error)) {
            errorDescription = errorData.error
          } else {
            errorMessage = errorData.error
          }
        }
        toast.error(errorMessage, { description: errorDescription })
        throw new Error(errorData.error || 'Failed to create vaga')
      }

      const result = await response.json()
      const vagaId = result.vaga?.id
      if (vagaId && idiomasRequisito.length > 0) {
        await saveIdiomasRequisito(vagaId, idiomasRequisito)
      }

      toast.success('Vaga publicada com sucesso!')
      router.push('/gorio/empregabilidade?tab=active')
      router.refresh()
    } catch (error) {
      console.error('Error creating vaga:', error)
      toast.error('Erro ao criar vaga', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  const handleCreateAndSendToApproval = async (data: any) => {
    try {
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      const { apiData, idiomasRequisito } = mapCriteriosToApiData(data)

      const response = await fetch(
        '/api/empregabilidade/vagas/new/send-to-approval',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage =
          errorData?.error || 'Falha ao enviar vaga para aprovação'
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const vagaId = result.vaga?.id
      if (vagaId && idiomasRequisito.length > 0) {
        await saveIdiomasRequisito(vagaId, idiomasRequisito)
      }

      toast.success('Vaga enviada para aprovação com sucesso!')
      router.push('/gorio/empregabilidade?tab=awaiting_approval')
      router.refresh()
    } catch (error) {
      console.error('Error creating vaga and sending to approval:', error)
      toast.error('Erro ao enviar vaga para aprovação', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      setIsSubmitting(false)
      setHasUnsavedChanges(true)
    }
  }

  const handleCreateDraft = async (data: any) => {
    try {
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      const { apiData, idiomasRequisito } = mapCriteriosToApiData(data)

      const response = await fetch('/api/empregabilidade/vagas/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()

        let errorMessage = 'Falha ao criar rascunho'
        let errorDescription = undefined

        if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error
        }

        if (errorData.message && typeof errorData.message === 'object') {
          const backendError = errorData.message.error || ''
          if (
            backendError.includes('UUID') ||
            backendError.includes('not null')
          ) {
            errorDescription =
              'Preencha todos os campos obrigatórios: Título, Descrição, Empresa, Regime de Contratação e Modelo de Trabalho'
          }
        }

        toast.error(errorMessage, { description: errorDescription })
        throw new Error(errorMessage)
      }

      const result = await response.json()
      const vagaId = result.vaga?.id
      if (vagaId && idiomasRequisito.length > 0) {
        await saveIdiomasRequisito(vagaId, idiomasRequisito)
      }

      toast.success('Rascunho salvo com sucesso!')
      router.push('/gorio/empregabilidade?tab=draft')
      router.refresh()
    } catch (error) {
      console.error('Error creating draft vaga:', error)
      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
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
          showActionButtons={true}
          onSubmit={handleCreateVaga}
          onSaveDraft={handleCreateDraft}
          onSendForApproval={handleCreateAndSendToApproval}
          onFormChangesDetected={setHasUnsavedChanges}
        />
      </div>
    </ContentLayout>
  )
}
