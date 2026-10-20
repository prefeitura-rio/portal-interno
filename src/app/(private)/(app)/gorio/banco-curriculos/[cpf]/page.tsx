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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import {
  getBancoCurriculosErrorStatus,
  useBancoCurriculo,
} from '@/hooks/use-banco-curriculos'
import { ArrowLeft, BriefcaseBusiness } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { use, useState } from 'react'
import { AssociarVagaDialog } from '../components/associar-vaga-dialog'
import {
  CabecalhoCurriculo,
  FichaCurriculo,
} from '../components/ficha-curriculo'
import { HistoricoCandidaturas } from '../components/historico-candidaturas'
import { nomeDeExibicao } from '../lib/format'

const ABA_FICHA = 'ficha'
const ABA_CANDIDATURAS = 'candidaturas'

export default function BancoCurriculoDetalhePage({
  params,
}: {
  params: Promise<{ cpf: string }>
}) {
  const { cpf } = use(params)
  const { data: curriculo, isLoading, error } = useBancoCurriculo(cpf)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Quem chega na ficha já tem acesso ao banco. Associar a vagas exige também
  // um perfil de empregabilidade; quem só tem o perfil do banco vê a ficha sem
  // o botão.
  const { hasEmpregoTrabalhoAccess } = useHeimdallUserContext()
  const [associando, setAssociando] = useState(false)
  // A aba fica na URL para o voltar do navegador manter onde o operador estava.
  const aba =
    searchParams.get('aba') === ABA_CANDIDATURAS ? ABA_CANDIDATURAS : ABA_FICHA

  function handleAba(proxima: string) {
    router.replace(
      proxima === ABA_CANDIDATURAS ? `${pathname}?aba=${proxima}` : pathname,
      { scroll: false }
    )
  }

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
        {curriculo && (
          <div className="space-y-6">
            <CabecalhoCurriculo
              curriculo={curriculo}
              acoes={
                hasEmpregoTrabalhoAccess && (
                  <Button variant="outline" onClick={() => setAssociando(true)}>
                    <BriefcaseBusiness className="mr-2 h-4 w-4" />
                    Associar a uma vaga
                  </Button>
                )
              }
            />
            <Tabs value={aba} onValueChange={handleAba}>
              <TabsList>
                <TabsTrigger value={ABA_FICHA}>
                  Informações profissionais
                </TabsTrigger>
                <TabsTrigger value={ABA_CANDIDATURAS}>Candidaturas</TabsTrigger>
              </TabsList>
              <TabsContent value={ABA_FICHA} className="mt-6">
                <FichaCurriculo curriculo={curriculo} />
              </TabsContent>
              <TabsContent value={ABA_CANDIDATURAS} className="mt-6">
                <HistoricoCandidaturas cpf={cpf} />
              </TabsContent>
            </Tabs>
            {/* Só monta aberto: a busca de vagas e do histórico roda aí. */}
            {hasEmpregoTrabalhoAccess && associando && (
              <AssociarVagaDialog
                cpf={cpf}
                open={associando}
                onOpenChange={setAssociando}
              />
            )}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}

function mensagemDeErro(status: number | null) {
  if (status === 400) return 'CPF inválido.'
  if (status === 404) return 'Currículo não encontrado.'
  return 'Não foi possível carregar o currículo. Tente novamente em instantes.'
}

function FichaIndisponivel({ status }: { status: number | null }) {
  return (
    <div className="space-y-4 rounded-md border p-6">
      <p className="text-muted-foreground">{mensagemDeErro(status)}</p>
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
