'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Suspense } from 'react'
import { BancoCurriculosTable } from './components/banco-curriculos-table'

export default function BancoCurriculosPage() {
  return (
    <ContentLayout title="Banco de currículos">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>GO Rio</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Banco de currículos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Banco de currículos
          </h2>
          <p className="text-muted-foreground">
            Consulte os currículos cadastrados pelos cidadãos na plataforma.
          </p>
        </div>

        {/* useSearchParams na tabela exige um Suspense acima */}
        <Suspense>
          <BancoCurriculosTable />
        </Suspense>
      </div>
    </ContentLayout>
  )
}
