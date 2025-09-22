'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { BookPlus } from 'lucide-react'
import Link from 'next/link'
import { ServicesDataTable } from '../components/services-data-table'

export default function ServicesPage() {
  // Mock da role do usuário - true = admin, false = usuário comum
  const isAdmin = true

  return (
    <ContentLayout title="Gestão de Serviços Municipais">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Serviços Municipais</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Serviços</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Serviços Municipais
              </h2>
              <p className="text-muted-foreground">
                Gerencie e monitore todos os serviços municipais disponíveis na
                plataforma.
              </p>
            </div>
            {isAdmin && (
              <Link href="/servicos-municipais/servicos/new">
                <Button className="cursor-pointer">
                  <BookPlus className="mr-2 h-4 w-4" />
                  Novo serviço
                </Button>
              </Link>
            )}
          </div>
        </div>

        <ServicesDataTable isAdmin={isAdmin} />
      </div>
    </ContentLayout>
  )
}
