'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { BookPlus } from 'lucide-react'
import Link from 'next/link'
import { OportunidadesMEIDataTable } from './components/oportunidades-mei-data-table'

export default function OportunidadesMEIPage() {
  // Use Heimdall role-based access control
  const { canEditGoRio } = useHeimdallUserContext()

  return (
    <ContentLayout title="Gestão de Oportunidades MEI">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Go Rio</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Oportunidades MEI</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Oportunidades MEI
              </h2>
              <p className="text-muted-foreground">
                Gerencie e monitore todas as oportunidades MEI disponíveis na
                plataforma.
              </p>
            </div>
            {canEditGoRio && (
              <Link href="/gorio/oportunidades-mei/new">
                <Button className="cursor-pointer">
                  <BookPlus className="mr-2 h-4 w-4" />
                  Nova oportunidade MEI
                </Button>
              </Link>
            )}
          </div>
        </div>

        <OportunidadesMEIDataTable />
      </div>
    </ContentLayout>
  )
}
