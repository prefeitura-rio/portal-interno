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
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { NewEmpresaForm } from './components/new-empresa-form'

export default function NewEmpresaPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleCreateEmpresa = async (data: any) => {
    try {
      console.log('Creating empresa:', data)

      // Mark as submitting to prevent guard from blocking
      setIsSubmitting(true)
      setHasUnsavedChanges(false)

      // Remove mask from CNPJ to get only numbers
      const cnpjNumbers = data.cnpj?.replace(/\D/g, '') || ''

      // Check if we're in staging and missing empresa_nome (CNPJ not searched)
      const isStaging = process.env.NEXT_PUBLIC_ENVIROMENT === 'staging'
      const needsStagingDefaults = isStaging && !data.empresa_nome

      // Map form data to API format
      const apiData = {
        cnpj: cnpjNumbers || (needsStagingDefaults ? '00000000000000' : ''),
        razao_social: data.empresa_nome || (needsStagingDefaults ? 'EMPRESA TESTE STAGING' : ''),
        nome_fantasia: data.nome_fantasia || (needsStagingDefaults ? 'Teste Staging' : ''),
        descricao: data.descricao,
        url_logo: data.logo_url,
      }

      console.log('Sending empresa data to API:', apiData)
      if (needsStagingDefaults) {
        console.log('⚠️ STAGING MODE: Using default values for CNPJ and razao_social')
      }

      const response = await fetch('/api/empregabilidade/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create empresa')
      }

      const result = await response.json()
      console.log('Empresa created successfully:', result)

      // Show success toast and redirect to empresas list or vagas list
      toast.success('Empresa cadastrada com sucesso!')
      router.push('/gorio/empregabilidade')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating empresa:', error)
      toast.error('Erro ao cadastrar empresa', {
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
