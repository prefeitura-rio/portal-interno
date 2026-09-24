'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getBancoCurriculosErrorStatus,
  useBancoCurriculo,
} from '@/hooks/use-banco-curriculos'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { FichaCurriculo } from '../components/ficha-curriculo'
import { nomeDeExibicao } from '../lib/format'

export default function BancoCurriculoDetalhePage({
  params,
}: {
  params: Promise<{ cpf: string }>
}) {
  const { cpf } = use(params)
  const { data: curriculo, isLoading, error } = useBancoCurriculo(cpf)

  return (
    <ContentLayout title="Banco de currículos">
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>GO Rio</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/gorio/banco-curriculos">Banco de currículos</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {curriculo ? nomeDeExibicao(curriculo) : 'Currículo'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {isLoading && <FichaSkeleton />}
        {error && (
          <FichaIndisponivel status={getBancoCurriculosErrorStatus(error)} />
        )}
        {curriculo && <FichaCurriculo curriculo={curriculo} />}
      </div>
    </ContentLayout>
  )
}

function FichaIndisponivel({ status }: { status: number | null }) {
  return (
    <div className="space-y-4 rounded-md border p-6">
      <p className="text-muted-foreground">
        {status === 404
          ? 'Currículo não encontrado.'
          : 'Não foi possível carregar o currículo. Tente novamente em instantes.'}
      </p>
      <Button asChild variant="outline">
        <Link href="/gorio/banco-curriculos">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o banco de currículos
        </Link>
      </Button>
    </div>
  )
}

function FichaSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
