'use client'

import { CandidatesTable } from '@/app/(private)/(app)/gorio/components/candidates-table'
import { NewEmpregabilidadeForm } from '@/app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmpregabilidade } from '@/hooks/use-empregabilidade'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function EmpregabilidadeDetailPage({
  params,
}: { params: Promise<{ 'empregabilidade-id': string }> }) {
  const [activeTab, setActiveTab] = useState('about')
  const [empregabilidadeId, setEmpregabilidadeId] = useState<number | null>(
    null
  )

  // Handle async params
  useEffect(() => {
    params.then(resolvedParams => {
      setEmpregabilidadeId(Number(resolvedParams['empregabilidade-id']))
    })
  }, [params])

  // Use the custom hook to fetch empregabilidade data
  const { empregabilidade, loading, error, refetch } = useEmpregabilidade(
    empregabilidadeId?.toString() || null
  )

  // Show loading state
  if (loading || !empregabilidadeId) {
    return (
      <ContentLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando vaga...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Show error state
  if (error || !empregabilidade) {
    return (
      <ContentLayout title="Erro">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Ban className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Erro ao carregar vaga
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Vaga não encontrada'}
            </p>
            <Link href="/gorio/empregabilidade">
              <Button>Voltar para Vagas</Button>
            </Link>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Transform API data to form format
  const formData = {
    titulo: empregabilidade.titulo || '',
    descricao: empregabilidade.descricao || '',
    contratante: empregabilidade.empresa_id?.toString() || '',
    regime_contratacao: empregabilidade.tipo_contratacao?.id?.toString() || '',
    modelo_trabalho: empregabilidade.jornada_trabalho?.id?.toString() || '',
    vaga_pcd: false, // TODO: Map from API when available
    tipo_pcd: [], // TODO: Map from API when available
    valor_vaga: empregabilidade.salario_max || empregabilidade.salario_min,
    bairro: '', // TODO: Map from API when available
    data_limite: empregabilidade.data_limite_candidatura
      ? new Date(empregabilidade.data_limite_candidatura)
      : undefined,
    requisitos: empregabilidade.pre_requisitos || '',
    diferenciais: '', // TODO: Map from API when available
    responsabilidades: '', // TODO: Map from API when available
    beneficios: empregabilidade.beneficios || '',
    etapas: [], // TODO: Map from API when available
    informacoes_complementares: [], // TODO: Map from API when available
    id_orgao_parceiro: empregabilidade.orgao_id || '',
  }

  return (
    <ContentLayout title="Detalhes da Vaga">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>GO Rio</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade">Empregabilidade</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {empregabilidade.titulo || 'Detalhes'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between md:flex-row flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {empregabilidade.titulo || 'Vaga de Emprego'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {empregabilidade.status && (
                  <Badge variant="outline" className="capitalize">
                    {empregabilidade.status.id || 'Ativa'}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Criada em{' '}
                  {empregabilidade.created_at
                    ? format(
                        new Date(empregabilidade.created_at),
                        'dd/MM/yyyy',
                        {
                          locale: ptBR,
                        }
                      )
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="about">Sobre a vaga</TabsTrigger>
            <TabsTrigger value="candidates">
              <Users className="w-4 h-4 mr-2" />
              Candidatos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            {/* Empregabilidade Form - Disabled */}
            <div className="pointer-events-none opacity-90">
              <NewEmpregabilidadeForm
                initialData={formData}
                isReadOnly={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="candidates" className="mt-6">
            <CandidatesTable
              empregabilidadeId={empregabilidadeId.toString()}
              empregabilidadeTitle={empregabilidade.titulo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
