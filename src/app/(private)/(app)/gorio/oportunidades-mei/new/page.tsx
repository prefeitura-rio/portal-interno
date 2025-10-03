'use client'
import { NewMEIOpportunityForm } from '@/app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import Link from 'next/link'

export default function NewMEIOpportunity() {
  const router = useRouter()

  const handleCreateOpportunity = async (data: any) => {
    try {
      console.log('Creating MEI opportunity:', data)

      const response = await fetch('/api/mei-opportunities/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create MEI opportunity')
      }

      const result = await response.json()
      console.log('MEI opportunity created successfully:', result)

      // Show success toast and redirect
      toast.success('Oportunidade MEI criada com sucesso!')
      router.push('/gorio/oportunidades-mei')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating MEI opportunity:', error)
      toast.error('Erro ao criar oportunidade MEI', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }

  const handleCreateDraft = async (data: any) => {
    try {
      console.log('Creating draft MEI opportunity:', data)

      const response = await fetch('/api/mei-opportunities/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create draft MEI opportunity')
      }

      const result = await response.json()
      console.log('Draft MEI opportunity created successfully:', result)

      // Show success toast and redirect
      toast.success('Rascunho salvo com sucesso!')
      router.push('/gorio/oportunidades-mei?tab=draft')

      // Trigger cache revalidation
      router.refresh()
    } catch (error) {
      console.error('Error creating draft MEI opportunity:', error)
      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    }
  }

  return (
    <ContentLayout title="Gestão de Oportunidades MEI">
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
            <h2 className="text-2xl font-bold tracking-tight">Nova Oportunidade MEI</h2>
            <p className="text-muted-foreground">Crie uma nova oportunidade MEI.</p>
          </div>
        </div>
        <NewMEIOpportunityForm
          onSubmit={handleCreateOpportunity}
          onSaveDraft={handleCreateDraft}
        />
      </div>
    </ContentLayout>
  )
}
