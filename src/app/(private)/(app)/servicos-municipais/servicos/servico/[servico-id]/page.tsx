'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { TombadoServiceInfo } from '@/components/tombado-service-info'
import { TombamentoModal } from '@/components/tombamento-modal'
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
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useService } from '@/hooks/use-service'
import { useServiceOperations } from '@/hooks/use-service-operations'
import { type Tombamento, useTombamentos } from '@/hooks/use-tombamentos'
import { transformToApiRequest } from '@/lib/service-data-transformer'
import type { ServiceStatusConfig } from '@/types/service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Save,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
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
  const router = useRouter()
  const [servicoId, setServicoId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSendToEditDialog, setShowSendToEditDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showSendToApprovalDialog, setShowSendToApprovalDialog] =
    useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<any>(null)
  const [showTombamentoModal, setShowTombamentoModal] = useState(false)
  const [isServiceTombado, setIsServiceTombado] = useState(false)
  const [shouldShowTombamentoModal, setShouldShowTombamentoModal] =
    useState(false)
  const [tombamentoLoading, setTombamentoLoading] = useState(false)
  const [tombamentoData, setTombamentoData] = useState<Tombamento | null>(null)
  const [showDestombamentoDialog, setShowDestombamentoDialog] = useState(false)

  useEffect(() => {
    params.then(({ 'servico-id': id }) => {
      setServicoId(id)
    })
  }, [params])

  // Check for tombamento parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('tombamento') === 'true') {
      setShouldShowTombamentoModal(true)
      // Clean up the URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  const { service, loading, error, refetch } = useService(servicoId)
  const {
    updateService,
    publishService,
    unpublishService,
    deleteService,
    loading: operationLoading,
  } = useServiceOperations()
  const { fetchTombamentos, deleteTombamento } = useTombamentos()
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const canEditServices = useCanEditBuscaServices()

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original data
    refetch()
  }

  const handleSave = async (data: any) => {
    if (!servicoId || !service) return

    try {
      setIsSaving(true)

      // First, fetch the current service data from the API to get the original status values
      const currentServiceResponse = await fetch(`/api/services/${servicoId}`)
      const currentServiceData = await currentServiceResponse.json()

      if (!currentServiceData.success) {
        throw new Error('Failed to fetch current service status')
      }

      const apiData = transformToApiRequest(data)

      // Use the convertFrontendToApi to get the correct API representation
      // but preserve the original status and awaiting_approval from the current API state
      const currentService = currentServiceData.service

      // Preserve the current status and awaiting_approval when just saving edits
      if (currentService.status === 'published') {
        apiData.status = 1 // Keep as published
        apiData.awaiting_approval = false
      } else if (currentService.status === 'awaiting_approval') {
        apiData.status = 0 // Keep as draft
        apiData.awaiting_approval = true // Preserve awaiting approval status
      } else {
        apiData.status = 0 // Keep as draft/in_edition
        apiData.awaiting_approval = false
      }

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
      // Set status to 0 (draft/in_edition) and awaiting_approval to false
      const apiData = transformToApiRequest(service)
      apiData.status = 0 // Set to draft/in_edition status
      apiData.awaiting_approval = false // Remove from awaiting approval

      await updateService(servicoId, apiData)
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

      // Show tombamento modal after successful publication
      setShowTombamentoModal(true)
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

  const handleTombarService = () => {
    setShowTombamentoModal(true)
  }

  const handleTombamentoSuccess = () => {
    toast.success('Tombamento criado com sucesso!')
    setShowTombamentoModal(false)
    setIsServiceTombado(true) // Mark service as tombado after successful tombamento
    setTombamentoLoading(false) // Ensure loading state is cleared

    // Redirect to services table with published tab
    router.push('/servicos-municipais/servicos?tab=published')
  }

  const handleDestombarService = () => {
    setShowDestombamentoDialog(true)
  }

  const handleConfirmDestombamento = async () => {
    if (!tombamentoData) return

    try {
      setTombamentoLoading(true)
      console.log('🔄 Starting destombar service operation...')
      const success = await deleteTombamento(tombamentoData.id)

      if (success) {
        setIsServiceTombado(false)
        setTombamentoData(null)
        setShowDestombamentoDialog(false)
        console.log('✅ Tombamento removed successfully')
      } else {
        console.error('❌ Failed to destombar service')
      }
    } catch (error) {
      console.error('❌ Error in destombar service flow:', error)
    } finally {
      setTombamentoLoading(false)
    }
  }

  // Check if service is tombado when service is loaded
  useEffect(() => {
    const checkTombamento = async () => {
      if (servicoId && service?.status === 'published') {
        setTombamentoLoading(true)
        try {
          const tombamentosResponse = await fetchTombamentos({ per_page: 100 })
          if (tombamentosResponse?.data?.tombamentos) {
            const tombamentos = tombamentosResponse.data.tombamentos
            const tombamento = tombamentos.find(
              tombamento => tombamento.id_servico_novo === servicoId
            )
            const isTombado = !!tombamento
            setIsServiceTombado(isTombado)

            if (tombamento) {
              setTombamentoData(tombamento)
            } else {
              setTombamentoData(null)
            }

            // Show tombamento modal if requested and service is not already tombado
            if (shouldShowTombamentoModal && !isTombado) {
              setShowTombamentoModal(true)
              setShouldShowTombamentoModal(false)
            }
          }
        } catch (error) {
          console.error('Error checking tombamento:', error)
        } finally {
          setTombamentoLoading(false)
        }
      } else {
        setTombamentoLoading(false)
      }
    }

    checkTombamento()
  }, [servicoId, service?.status, fetchTombamentos, shouldShowTombamentoModal])

  // Function to determine which buttons should be shown based on user role and service status
  const getButtonConfiguration = () => {
    if (!service) return { showEdit: false, showAdditionalButtons: [] }

    const { status } = service

    // Admin users (admin, superadmin, busca:services:admin) have full permissions
    if (isBuscaServicesAdmin) {
      switch (status) {
        case 'published': {
          const publishedButtons = []

          if (!isServiceTombado && !tombamentoLoading) {
            publishedButtons.push({
              label: 'Tombar',
              action: handleTombarService,
              className:
                'text-orange-600 border-orange-500 border-1 bg-orange-50 hover:bg-orange-100 hover:text-orange-700',
              icon: AlertTriangle,
            })
          }

          if (isServiceTombado && !tombamentoLoading) {
            publishedButtons.push({
              label: 'Destombar',
              action: handleDestombarService,
              className:
                'text-red-600 border-red-500 border-1 bg-red-50 hover:bg-red-100 hover:text-red-700',
              icon: AlertCircle,
            })
          }

          return {
            showEdit: true,
            showAdditionalButtons: publishedButtons,
          }
        }
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

    // Editor users (busca:services:editor) have restricted permissions
    if (canEditServices) {
      switch (status) {
        case 'published':
          // CRITICAL: Editors cannot edit published services
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

    // For any other roles or no permissions
    return { showEdit: false, showAdditionalButtons: [] }
  }

  if (loading || !servicoId) {
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
          <div className="flex items-start justify-between md:flex-row flex-col gap-4 md:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
                {service.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={config.variant}
                    className={`capitalize ${config.className}`}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  {/* Tombamento status badge */}
                  {service.status === 'published' &&
                    (tombamentoLoading ? (
                      <div className="animate-pulse">
                        <div className="h-5 w-22 bg-muted rounded-full" />
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          isServiceTombado
                            ? 'text-green-600 border-green-200 bg-green-50'
                            : 'text-orange-600 border-orange-200 bg-orange-50'
                        }
                      >
                        {isServiceTombado ? (
                          <>
                            <Archive className="w-3 h-3 mr-1" />
                            Tombado
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Tombamento pendente
                          </>
                        )}
                      </Badge>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                  <span>
                    Criado em{' '}
                    {format(service.created_at || new Date(), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                  {service.published_at && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        Publicado em{' '}
                        {format(service.published_at, 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 md:mt-0">
              {(() => {
                const buttonConfig = getButtonConfiguration()

                if (!isEditing) {
                  return (
                    <>
                      {buttonConfig.showEdit && (
                        <Button
                          onClick={handleEdit}
                          disabled={loading || operationLoading}
                          className="w-full sm:w-auto"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                      {buttonConfig.showAdditionalButtons.map(
                        (button, index) => (
                          <Button
                            key={index}
                            onClick={button.action}
                            disabled={loading || operationLoading || isSaving}
                            className={`w-full sm:w-auto ${(button as any).className || ''}`}
                          >
                            {(button as any).icon &&
                              React.createElement((button as any).icon, {
                                className: 'h-4 w-4 mr-2',
                              })}
                            {button.label}
                          </Button>
                        )
                      )}
                    </>
                  )
                }

                return (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      form="service-edit-form"
                      disabled={isSaving || operationLoading}
                      className="w-full sm:w-auto"
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
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar edição'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving || operationLoading}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Tombamento Information Card */}
        {isServiceTombado && tombamentoData && (
          <TombadoServiceInfo
            origem={tombamentoData.origem}
            idServicoAntigo={tombamentoData.id_servico_antigo}
            criadoEm={tombamentoData.criado_em}
            criadoPor={tombamentoData.criado_por}
            observacoes={tombamentoData.observacoes}
          />
        )}

        <NewServiceForm
          readOnly={!isEditing}
          isLoading={isSaving || operationLoading}
          onSubmit={isEditing ? handleSaveClick : undefined}
          serviceStatus={service.status}
          onSendToApproval={handleSendToApproval}
          onPublish={handleApproveAndPublish}
          serviceId={servicoId || undefined}
          initialData={{
            managingOrgan: service.managingOrgan,
            serviceCategory: service.serviceCategory,
            targetAudience: service.targetAudience,
            title: service.title,
            shortDescription: service.shortDescription,
            buttons: service.buttons,
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

        <ConfirmDialog
          open={showDestombamentoDialog}
          onOpenChange={setShowDestombamentoDialog}
          title="Destombar Serviço"
          description="Tem certeza que deseja destombar este serviço? Isso irá reverter a migração e o serviço antigo voltará a aparecer normalmente."
          confirmText="Destombar"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleConfirmDestombamento}
        />

        {/* Tombamento Modal */}
        {servicoId && service && (
          <TombamentoModal
            open={showTombamentoModal}
            onOpenChange={setShowTombamentoModal}
            serviceId={servicoId}
            serviceTitle={service.title}
            onSuccess={handleTombamentoSuccess}
          />
        )}
      </div>
    </ContentLayout>
  )
}
