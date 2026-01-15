'use client'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { BookPlus } from 'lucide-react'
import Link from 'next/link'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'

export default function EmpregabilidadePage() {
  const { canEditGoRio } = useHeimdallUserContext()
  return (
    <ContentLayout title="Gestão de Vagas de Empregos">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Vagas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Vagas de Empregos
            </h2>
            <p className="text-muted-foreground">
              Gerencie e monitore todas as vagas de empregos disponíveis na
              plataforma.
            </p>
          </div>
          {canEditGoRio && (
            //adicionar botão de nova empresa ao lado
            <div className="flex items-center gap-2">
              <Button variant="outline" className="cursor-pointer">
                <BookPlus className="mr-2 h-4 w-4" />
                Nova empresa
              </Button>

              <Link href="/gorio/empregabilidade/new">
                <Button className="cursor-pointer">
                  <BookPlus className="mr-2 h-4 w-4" />
                  Nova vaga
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
