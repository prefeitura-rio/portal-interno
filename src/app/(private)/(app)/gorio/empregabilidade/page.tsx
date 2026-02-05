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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { BookPlus, Building2, ChevronDown, Eye, Plus } from 'lucide-react'
import Link from 'next/link'
import { EmpregabilidadeDataTable } from './components/empregabilidade-data-table'

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
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    Empresas
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/gorio/empregabilidade/new/empresa">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar nova Empresa
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/gorio/empregabilidade/empresas">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver empresas
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/gorio/empregabilidade/new">
                <Button className="cursor-pointer">
                  <BookPlus className="mr-2 h-4 w-4" />
                  Nova vaga
                </Button>
              </Link>
            </div>
          )}
        </div>

        <EmpregabilidadeDataTable />
      </div>
    </ContentLayout>
  )
}
