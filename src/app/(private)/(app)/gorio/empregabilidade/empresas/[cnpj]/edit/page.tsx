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
import { Skeleton } from '@/components/ui/skeleton'
import { NewEmpresaForm } from '@/app/(private)/(app)/gorio/empregabilidade/new/empresa/components/new-empresa-form'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useEmpresa } from '@/hooks/use-empresa'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { toast } from 'sonner'

/**
 * ============================================================================
 * PAGE: Edit Empresa
 * ============================================================================
 * Allows editing an existing empresa
 *
 * ROUTE: /gorio/empregabilidade/empresas/[cnpj]/edit
 *
 * FEATURES:
 * - Fetches existing empresa data
 * - Pre-populates form with empresa data
 * - Field mapping: API → Form (razao_social → empresa_nome, url_logo → logo_url)
 * - Updates empresa via PUT API route
 * - Field mapping: Form → API (empresa_nome → razao_social, logo_url → url_logo)
 * - Redirects to view page after successful update
 *
 * DATA FLOW:
 * 1. Extract CNPJ from URL params
 * 2. Use useEmpresa hook to fetch empresa data
 * 3. Transform API data to form format
 * 4. Display NewEmpresaForm with initialData and isEditMode=true
 * 5. On submit, transform form data back to API format
 * 6. Call PUT /api/empregabilidade/empresas/{cnpj}
 * 7. Redirect to view page
 *
 * VALIDATION:
 * - User must have canEditGoRio permission
 * - CNPJ validation (14 digits)
 * - All form validations from NewEmpresaForm apply
 * - API route validates field consistency
 */

export default function EditEmpresaPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = use(params)
  const router = useRouter()
  const { canEditGoRio } = useHeimdallUserContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
   * Handle form submission
   *
   * DATA TRANSFORMATION:
   * Form → API:
   * - empresa_nome → razao_social
   * - logo_url → url_logo
   * - cnpj (formatted) → cnpj (14 digits)
   *
   * VALIDATION:
   * - All fields present
   * - CNPJ consistency check
   * - API route performs additional validation
   *
   * ON SUCCESS:
   * - Show success toast
   * - Redirect to view page
   * - Refresh router cache
   *
   * ON ERROR:
   * - Show error toast with details
   * - Keep user on edit page
   */
  const handleUpdateEmpresa = async (data: {
    cnpj?: string
    empresa_nome?: string
    nome_fantasia?: string
    descricao: string
    logo_url: string
  }) => {
    setIsSubmitting(true)

    try {
      // Step 1: Strip CNPJ mask to get 14 digits
      const cnpjNumbers = cnpj.replace(/\D/g, '')

      console.log('[EditEmpresaPage] Updating empresa:', {
        cnpj: cnpjNumbers,
        formData: data,
      })

      // Step 2: Transform form data to API format
      // CRITICAL: Map field names correctly
      const apiData = {
        cnpj: cnpjNumbers, // Ensure consistency
        razao_social: data.empresa_nome || '', // ← TRANSFORM
        nome_fantasia: data.nome_fantasia || '',
        descricao: data.descricao,
        url_logo: data.logo_url, // ← TRANSFORM
      }

      console.log('[EditEmpresaPage] API payload:', apiData)

      // Step 3: Call PUT API route
      const response = await fetch(
        `/api/empregabilidade/empresas/${cnpjNumbers}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        }
      )

      // Step 4: Handle response
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update empresa')
      }

      const result = await response.json()
      console.log('[EditEmpresaPage] Update successful:', result)

      // Step 5: Show success message
      toast.success('Empresa atualizada com sucesso!')

      // Step 6: Redirect to view page
      router.push(`/gorio/empregabilidade/empresas/${cnpjNumbers}`)
      router.refresh()
    } catch (error) {
      console.error('[EditEmpresaPage] Error updating empresa:', error)
      toast.error('Erro ao atualizar empresa', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
      setIsSubmitting(false)
    }
  }

  // Redirect if user doesn't have permission
  if (!canEditGoRio) {
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
                <BreadcrumbPage>Editar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="rounded-md border border-destructive p-4">
            <p className="text-sm text-destructive font-medium">
              Acesso negado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Você não tem permissão para editar empresas.
            </p>
          </div>
        </div>
      </ContentLayout>
    )
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
                <BreadcrumbPage>Editar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="rounded-md border border-destructive p-4">
            <p className="text-sm text-destructive font-medium">
              Erro ao carregar empresa
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Show loading skeleton
  if (loading || !empresa) {
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
                <BreadcrumbPage>Editar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </ContentLayout>
    )
  }

  /**
   * Transform API data to form format
   * CRITICAL: Map field names correctly
   *
   * API → Form:
   * - razao_social → empresa_nome
   * - url_logo → logo_url
   * - cnpj (14 digits) → cnpj (formatted)
   */
  const initialData = {
    cnpj: formatCNPJ(empresa.cnpj || ''),
    empresa_nome: empresa.razao_social || '', // ← TRANSFORM
    nome_fantasia: empresa.nome_fantasia || '',
    descricao: empresa.descricao || '',
    logo_url: empresa.url_logo || '', // ← TRANSFORM
  }

  return (
    <ContentLayout title="Editar Empresa">
      <div className="space-y-4">
        {/* Breadcrumb */}
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
              <BreadcrumbLink asChild>
                <Link href={`/gorio/empregabilidade/empresas/${cnpj}`}>
                  {empresa.razao_social || empresa.nome_fantasia || 'Empresa'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Editar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Editar Empresa</h2>
          <p className="text-muted-foreground">
            Atualize as informações da empresa abaixo
          </p>
        </div>

        {/* Form */}
        <NewEmpresaForm
          initialData={initialData}
          isEditMode={true}
          onSubmit={handleUpdateEmpresa}
          isReadOnly={isSubmitting}
        />
      </div>
    </ContentLayout>
  )
}
