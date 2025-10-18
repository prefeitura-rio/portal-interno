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
import { useCreateMEIOpportunity } from '@/hooks/use-create-mei-opportunity'

import Link from 'next/link'

export default function NewMEIOpportunity() {
  const { createOpportunity, createDraft } = useCreateMEIOpportunity()

  const handleCreateOpportunity = async (data: any) => {
    await createOpportunity(data)
  }

  const handleCreateDraft = async (data: any) => {
    await createDraft(data)
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
        />
      </div>
    </ContentLayout>
  )
}
