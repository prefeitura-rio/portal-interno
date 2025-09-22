'use client'

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
import { useService } from '@/hooks/use-service'
import type { ServiceStatusConfig } from '@/types/service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, Clock, Edit, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NewServiceForm } from '../../../components/new-service-form'

// Status configuration for badges
const statusConfig: Record<string, ServiceStatusConfig> = {
  published: {
    icon: CheckCircle,
    label: 'Publicado',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  waiting_approval: {
    icon: Clock,
    label: 'Aguardando aprovação',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  in_edition: {
    icon: Edit,
    label: 'Em edição',
    variant: 'secondary',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
}

interface ServiceDetailPageProps {
  params: Promise<{ 'servico-id': string }>
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const [servicoId, setServicoId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    params.then(({ 'servico-id': id }) => {
      setServicoId(id)
    })
  }, [params])

  const { service, loading, error, refetch } = useService(servicoId)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original data
    refetch()
  }

  const handleSave = async (data: any) => {
    try {
      setIsSaving(true)
      // TODO: Implement save functionality
      console.log('Saving service:', data)
      toast.success('Serviço salvo com sucesso!')
      setIsEditing(false)
      refetch()
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error('Erro ao salvar serviço. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <ContentLayout title="Carregando serviço...">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </ContentLayout>
    )
  }

  if (error) {
    return (
      <ContentLayout title="Erro ao carregar serviço">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Link href="/servicos-municipais/servicos">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para serviços
              </Button>
            </Link>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (!service) {
    return (
      <ContentLayout title="Serviço não encontrado">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              O serviço solicitado não foi encontrado.
            </p>
            <Link href="/servicos-municipais/servicos">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para serviços
              </Button>
            </Link>
          </div>
        </div>
      </ContentLayout>
    )
  }

  const config = statusConfig[service.status] || statusConfig.published
  const StatusIcon = config.icon

  return (
    <ContentLayout title="Detalhes do Serviço">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Serviços Municipais</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/servicos-municipais/servicos">Serviços</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{service.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between md:flex-row flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {service.title}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge
                  variant={config.variant}
                  className={`capitalize ${config.className}`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Criado em{' '}
                  {format(service.created_at || new Date(), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </span>
                {service.published_at && (
                  <span className="text-sm text-muted-foreground">
                    • Publicado em{' '}
                    {format(service.published_at, 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {!isEditing ? (
                <Button
                  onClick={handleEdit}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 md:flex-none"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 md:flex-none"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <NewServiceForm
          readOnly={!isEditing}
          isLoading={isSaving}
          onSubmit={isEditing ? handleSave : undefined}
          initialData={{
            managingOrgan: service.managingOrgan,
            serviceCategory: service.serviceCategory,
            targetAudience: service.targetAudience,
            title: service.title,
            shortDescription: service.shortDescription,
            whatServiceDoesNotCover: service.whatServiceDoesNotCover,
            serviceTime: service.serviceTime,
            serviceCost: service.serviceCost,
            isFree: service.isFree,
            requestResult: service.requestResult,
            fullDescription: service.fullDescription,
            requiredDocuments: service.requiredDocuments,
            instructionsForRequester: service.instructionsForRequester,
            digitalChannels: service.digitalChannels,
          }}
        />
      </div>
    </ContentLayout>
  )
}
