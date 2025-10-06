'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useUserRoleContext } from '@/contexts/user-role-context'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { BookPlus } from 'lucide-react'
import Link from 'next/link'
import { OportunidadesMEIDataTable } from './components/oportunidades-mei-data-table'

export default function OportunidadesMEIPage() {
  // Use role-based access control instead of hardcoded value
  const { hasElevatedPermissions } = useUserRoleContext()

  return (
    <ContentLayout title="Gestão de Oportunidades MEI">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Gório</BreadcrumbItem>
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
            {hasElevatedPermissions && (
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
