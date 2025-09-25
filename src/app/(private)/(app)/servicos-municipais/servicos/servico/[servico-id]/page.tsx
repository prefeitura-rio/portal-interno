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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useService } from '@/hooks/use-service'
import { useServiceOperations } from '@/hooks/use-service-operations'
import { useUserRole } from '@/hooks/use-user-role'
import { transformToApiRequest } from '@/lib/service-data-transformer'
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
  awaiting_approval: {
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
  const [showSendToEditDialog, setShowSendToEditDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showSendToApprovalDialog, setShowSendToApprovalDialog] =
    useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<any>(null)

  useEffect(() => {
    params.then(({ 'servico-id': id }) => {
      setServicoId(id)
    })
  }, [params])

  const { service, loading, error, refetch } = useService(servicoId)
  const {
    updateService,
    publishService,
    unpublishService,
    deleteService,
    loading: operationLoading,
  } = useServiceOperations()
  const userRole = useUserRole()

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original data
    refetch()
  }

  const handleSave = async (data: any) => {
    if (!servicoId) return

    try {
      setIsSaving(true)
      const apiData = transformToApiRequest(data)
      await updateService(servicoId, apiData)
      setIsEditing(false)
      setShowSaveDialog(false)
      setPendingFormData(null)
      refetch()
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error('Erro ao salvar serviço. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = (data: any) => {
    setPendingFormData(data)
    setShowSaveDialog(true)
  }

  const handleConfirmSave = () => {
    if (pendingFormData) {
      handleSave(pendingFormData)
    }
  }

  const handleSendToEdit = async () => {
    if (!servicoId || !service) return

    try {
      setIsSaving(true)
      // Unpublish the service (set status to 0 - draft/in_edition)
      await unpublishService(servicoId)
      setShowSendToEditDialog(false)
      refetch()
    } catch (error) {
      console.error('Error sending service to edit:', error)
      toast.error('Erro ao enviar serviço para edição. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApproveAndPublish = async () => {
    if (!servicoId) return

    try {
      setIsSaving(true)
      await publishService(servicoId)
      setShowApproveDialog(false)
      refetch()
    } catch (error) {
      console.error('Error approving and publishing service:', error)
      toast.error('Erro ao aprovar e publicar serviço. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendToApproval = async () => {
    if (!servicoId || !service) return

    try {
      setIsSaving(true)
      // Set awaiting_approval flag - this might need special handling in the API
      const apiData = transformToApiRequest(service)
      apiData.awaiting_approval = true
      await updateService(servicoId, apiData)

      toast.success('Serviço enviado para aprovação!')
      setShowSendToApprovalDialog(false)
      setIsEditing(false)
      refetch()
    } catch (error) {
      console.error('Error sending service to approval:', error)
      toast.error('Erro ao enviar serviço para aprovação. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Function to determine which buttons should be shown based on user role and service status
  const getButtonConfiguration = () => {
    if (!service || !userRole)
      return { showEdit: false, showAdditionalButtons: [] }

    const isAdminOrGeral = userRole === 'admin' || userRole === 'geral'
    const isEditor = userRole === 'editor'
    const { status } = service

    if (isAdminOrGeral) {
      switch (status) {
        case 'published':
          return { showEdit: true, showAdditionalButtons: [] }
        case 'in_edition':
          return { showEdit: true, showAdditionalButtons: [] }
        case 'awaiting_approval':
          return {
            showEdit: true,
            showAdditionalButtons: [
              {
                label: 'Enviar para edição',
                action: () => setShowSendToEditDialog(true),
                variant: 'outline' as const,
              },
              {
                label: 'Aprovar e publicar',
                action: () => setShowApproveDialog(true),
                variant: 'default' as const,
              },
            ],
          }
        default:
          return { showEdit: true, showAdditionalButtons: [] }
      }
    }

    if (isEditor) {
      switch (status) {
        case 'published':
          return { showEdit: false, showAdditionalButtons: [] }
        case 'in_edition':
          return { showEdit: true, showAdditionalButtons: [] }
        case 'awaiting_approval':
          return {
            showEdit: true,
            showAdditionalButtons: [
              {
                label: 'Enviar para edição',
                action: () => setShowSendToEditDialog(true),
                variant: 'outline' as const,
              },
            ],
          }
        default:
          return { showEdit: false, showAdditionalButtons: [] }
      }
    }

    return { showEdit: false, showAdditionalButtons: [] }
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
              {(() => {
                const buttonConfig = getButtonConfiguration()

                if (!isEditing) {
                  return (
                    <>
                      {buttonConfig.showEdit && (
                        <Button
                          onClick={handleEdit}
                          disabled={loading || operationLoading}
                          className="w-full md:w-auto"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      )}
                      {buttonConfig.showAdditionalButtons.map(
                        (button, index) => (
                          <Button
                            key={index}
                            variant={button.variant}
                            onClick={button.action}
                            disabled={loading || operationLoading || isSaving}
                            className="w-full md:w-auto"
                          >
                            {button.label}
                          </Button>
                        )
                      )}
                    </>
                  )
                }

                return (
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button
                      type="button"
                      form="service-edit-form"
                      disabled={isSaving || operationLoading}
                      className="flex-1 md:flex-none"
                      onClick={() => {
                        // We'll use form.handleSubmit to trigger validation and get data
                        const formElement = document.getElementById(
                          'service-edit-form'
                        ) as HTMLFormElement
                        if (formElement) {
                          formElement.requestSubmit()
                        }
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Salvando...' : 'Salvar edição'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving || operationLoading}
                      className="flex-1 md:flex-none"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <NewServiceForm
          readOnly={!isEditing}
          isLoading={isSaving || operationLoading}
          onSubmit={isEditing ? handleSaveClick : undefined}
          userRole={userRole}
          serviceStatus={service.status}
          onSendToApproval={handleSendToApproval}
          serviceId={servicoId || undefined}
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
            physicalChannels: service.physicalChannels,
            legislacaoRelacionada: service.legislacaoRelacionada,
          }}
        />

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          open={showSendToEditDialog}
          onOpenChange={setShowSendToEditDialog}
          title="Enviar para edição"
          description="Tem certeza que deseja enviar este serviço para edição? O status será alterado para 'Em edição'."
          confirmText="Enviar para edição"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleSendToEdit}
        />

        <ConfirmDialog
          open={showApproveDialog}
          onOpenChange={setShowApproveDialog}
          title="Aprovar e publicar"
          description="Tem certeza que deseja aprovar e publicar este serviço? Ele ficará disponível no pref.rio para todos os cidadãos."
          confirmText="Aprovar e publicar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleApproveAndPublish}
        />

        <ConfirmDialog
          open={showSendToApprovalDialog}
          onOpenChange={setShowSendToApprovalDialog}
          title="Enviar para aprovação"
          description="Tem certeza que deseja enviar este serviço para aprovação? Ele ficará disponível para o grupo de administradores revisar."
          confirmText="Enviar para aprovação"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleSendToApproval}
        />

        <ConfirmDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          title="Salvar edição"
          description="Tem certeza que deseja salvar as alterações realizadas no serviço?"
          confirmText="Salvar alterações"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleConfirmSave}
        />
      </div>
    </ContentLayout>
  )
}
