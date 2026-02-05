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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useEmpresa } from '@/hooks/use-empresa'
import { Building2, Calendar, Globe, Pencil } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

/**
 * ============================================================================
 * PAGE: View Empresa
 * ============================================================================
 * Displays detailed information about a single empresa
 *
 * ROUTE: /gorio/empregabilidade/empresas/[cnpj]
 *
 * FEATURES:
 * - Read-only view of empresa data
 * - Format CNPJ for display
 * - Display logo image
 * - Show all empresa fields
 * - Edit button (if user has permission)
 *
 * DATA FLOW:
 * 1. Extract CNPJ from URL params
 * 2. Use useEmpresa hook to fetch empresa data
 * 3. Display loading skeleton while fetching
 * 4. Display empresa data or error message
 */

export default function ViewEmpresaPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = use(params)
  const { canEditGoRio } = useHeimdallUserContext()

  // Fetch empresa using custom hook
  const { empresa, loading, error } = useEmpresa(cnpj)

  /**
   * Format CNPJ for display
   * Input: "12345678000190"
   * Output: "12.345.678/0001-90"
   */
  const formatCNPJ = (value: string): string => {
    if (!value) return ''
    const numbers = value.replace(/\D/g, '')
    if (numbers.length !== 14) return value
    return numbers.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
  }

  /**
   * Format date for display
   * Input: "2024-01-15T10:30:00Z"
   * Output: "15/01/2024 10:30"
   */
  const formatDate = (value: string | undefined): string => {
    if (!value) return 'Não informado'
    const date = new Date(value)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  // Show error if fetch failed
  if (error) {
    return (
      <ContentLayout title="Empresas">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade/empresas">Empresas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Visualizar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="rounded-md border border-destructive p-4">
            <p className="text-sm text-destructive font-medium">
              Erro ao carregar empresa
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/gorio/empregabilidade/empresas">Voltar</Link>
            </Button>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Show loading skeleton
  if (loading) {
    return (
      <ContentLayout title="Empresas">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade/empresas">Empresas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Visualizar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-96 w-full" />
        </div>
      </ContentLayout>
    )
  }

  // Show not found if empresa is null
  if (!empresa) {
    return (
      <ContentLayout title="Empresas">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade/empresas">Empresas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Visualizar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Empresa não encontrada</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/gorio/empregabilidade/empresas">Voltar</Link>
            </Button>
          </div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Gestão de Empresas">
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade/empresas">Empresas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Visualizar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {empresa.razao_social || empresa.nome_fantasia || 'Empresa'}
              </h2>
              <p className="text-muted-foreground">
                CNPJ: {formatCNPJ(empresa.cnpj || '')}
              </p>
            </div>
            {canEditGoRio && (
              <Button asChild>
                <Link href={`/gorio/empregabilidade/empresas/${cnpj}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Company Details */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Logo Card */}
          {empresa.url_logo && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Logo da Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                  <img
                    src={empresa.url_logo}
                    alt={`Logo de ${empresa.razao_social || empresa.nome_fantasia}`}
                    className="max-h-[200px] max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Razão Social
                </label>
                <p className="text-base">
                  {empresa.razao_social || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Nome Fantasia
                </label>
                <p className="text-base">
                  {empresa.nome_fantasia || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  CNPJ
                </label>
                <p className="text-base font-mono">
                  {formatCNPJ(empresa.cnpj || '')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Informações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Setor
                </label>
                <p className="text-base">
                  {empresa.setor || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Porte
                </label>
                <p className="text-base">
                  {empresa.porte || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Website
                </label>
                <p className="text-base">
                  {empresa.website ? (
                    <a
                      href={empresa.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {empresa.website}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">
                {empresa.descricao || (
                  <span className="text-muted-foreground">
                    Nenhuma descrição fornecida
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Data de Criação
                </label>
                <p className="text-base">{formatDate(empresa.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Última Atualização
                </label>
                <p className="text-base">{formatDate(empresa.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button variant="outline" asChild>
            <Link href="/gorio/empregabilidade/empresas">Voltar</Link>
          </Button>
          {canEditGoRio && (
            <Button asChild>
              <Link href={`/gorio/empregabilidade/empresas/${cnpj}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
