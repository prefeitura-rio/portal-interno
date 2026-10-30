'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { ServicePreviewModal } from '@/components/preview/service-preview-modal'
import { ServiceVersionHistory } from '@/components/service-version-history'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
import { useDepartment } from '@/hooks/use-department'
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useService } from '@/hooks/use-service'
import { useServiceOperations } from '@/hooks/use-service-operations'
import { type Tombamento, useTombamentos } from '@/hooks/use-tombamentos'
import {
  transformToApiRequest,
  transformToFormData,
} from '@/lib/service-data-transformer'
import { mapFormDataToPreview } from '@/lib/service-preview-mapper'
import { findTombamentosByNewService } from '@/lib/tombamento-duplicates'
import type { ServiceStatusConfig } from '@/types/service'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  EllipsisVertical,
  Eye,
  Link as LinkIcon,
  Pause,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
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

interface ButtonConfig {
  label: string
  action: () => void
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

interface ButtonConfiguration {
  showEdit: boolean
  primaryButtons: ButtonConfig[]
  secondaryButtons: ButtonConfig[]
  destructiveButtons: ButtonConfig[]
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
  const [serviceTombamentos, setServiceTombamentos] = useState<Tombamento[]>([])
  const [showDestombamentoDialog, setShowDestombamentoDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [hasFormChanges, setHasFormChanges] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false)

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
  const { fetchAllTombamentos, deleteTombamentos } = useTombamentos()
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const canEditServices = useCanEditBuscaServices()

  // Get department name for preview
  const { department } = useDepartment(service?.managingOrgan || null)

  const initialFormData = useMemo(() => {
    if (!service) {
      return null
    }

    return {
      managingOrgan: service.managingOrgan,
      serviceCategory: service.serviceCategory,
      serviceSubcategory: service.serviceSubcategory,
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
    }
  }, [service])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setHasFormChanges(false)
    // Reset form to original data
    refetch()
  }

  // Interceptar mudanças de tab quando há alterações não salvas
  const handleTabChange = useCallback(
    (newTab: string) => {
      if (isEditing && hasFormChanges && newTab !== activeTab) {
        setPendingTab(newTab)
        setShowTabChangeDialog(true)
      } else {
        setActiveTab(newTab)
      }
    },
    [isEditing, hasFormChanges, activeTab]
  )

  const handleConfirmTabChange = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab)
      setPendingTab(null)
    }
    setShowTabChangeDialog(false)
  }, [pendingTab])

  const handleCancelTabChange = useCallback(() => {
    setPendingTab(null)
    setShowTabChangeDialog(false)
  }, [])

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
      setHasFormChanges(false)
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
      const apiData = transformToApiRequest(transformToFormData(service))
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
      const apiData = transformToApiRequest(transformToFormData(service))
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
    if (serviceTombamentos.length === 0) return

    try {
      setTombamentoLoading(true)
      console.log('🔄 Starting destombar service operation...')
      const removedIds = await deleteTombamentos(
        serviceTombamentos.map(tombamento => tombamento.id)
      )
      const remaining = serviceTombamentos.filter(
        tombamento => !removedIds.includes(tombamento.id)
      )
      setServiceTombamentos(remaining)
      setIsServiceTombado(remaining.length > 0)

      if (remaining.length === 0) {
        setShowDestombamentoDialog(false)
        console.log('✅ Tombamento removed successfully')
      } else {
        console.error('❌ Failed to remove every tombamento of service')
      }
    } catch (error) {
      console.error('❌ Error in destombar service flow:', error)
    } finally {
      setTombamentoLoading(false)
    }
  }

  const handleDeleteService = async () => {
    if (!servicoId || !service) return

    try {
      setIsSaving(true)
      await deleteService(servicoId)
      toast.success('Serviço excluído com sucesso!')
      setShowDeleteDialog(false)
      // Redirect to services list
      router.push('/servicos-municipais/servicos')
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Erro ao excluir serviço. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnpublishService = async () => {
    if (!servicoId) return

    try {
      setIsSaving(true)
      await unpublishService(servicoId)
      toast.success('Serviço despublicado com sucesso!')
      setShowUnpublishDialog(false)
      refetch()
    } catch (error) {
      console.error('Error unpublishing service:', error)
      toast.error('Erro ao despublicar serviço. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Check if service is tombado when service is loaded
  const checkTombamento = useCallback(async () => {
    if (!servicoId || service?.status !== 'published') {
      setTombamentoLoading(false)
      return
    }

    setTombamentoLoading(true)
    try {
      const tombamentos = await fetchAllTombamentos()
      if (tombamentos) {
        const found = findTombamentosByNewService(tombamentos, servicoId)
        const isTombado = found.length > 0
        setIsServiceTombado(isTombado)
        setServiceTombamentos(found)

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
  }, [
    servicoId,
    service?.status,
    fetchAllTombamentos,
    shouldShowTombamentoModal,
  ])

  useEffect(() => {
    checkTombamento()
  }, [checkTombamento])

  // Function to determine which buttons should be shown based on user role and service status
  // Returns buttons organized by category: primary actions, secondary actions, and destructive actions
  const getButtonConfiguration = (): ButtonConfiguration => {
    if (!service)
      return {
        showEdit: false,
        primaryButtons: [],
        secondaryButtons: [],
        destructiveButtons: [],
      }

    const { status } = service

    // Admin users (admin, superadmin, busca:services:admin) have full permissions
    if (isBuscaServicesAdmin) {
      switch (status) {
        case 'published': {
          const primaryButtons: ButtonConfig[] = []
          const secondaryButtons: ButtonConfig[] = []
          const destructiveButtons: ButtonConfig[] = []

          // Tombamento actions (secondary/administrative)
          if (!isServiceTombado && !tombamentoLoading) {
            secondaryButtons.push({
              label: 'Tombar',
              action: handleTombarService,
              // variant: 'outline' as const,
              icon: AlertCircle,
              className: 'text-orange-600! border-orange-200 bg-orange-50!',
            })
          }

          if (isServiceTombado && !tombamentoLoading) {
            secondaryButtons.push({
              label: 'Destombar',
              action: handleDestombarService,
              icon: AlertCircle,
              variant: 'secondary' as const,
            })
          }

          // Destructive actions (grouped together)
          destructiveButtons.push({
            label: 'Despublicar',
            action: () => setShowUnpublishDialog(true),
            variant: 'secondary' as const,
            icon: Pause,
          })

          destructiveButtons.push({
            label: 'Excluir',
            action: () => setShowDeleteDialog(true),
            variant: 'destructive' as const,
            icon: Trash2,
          })

          return {
            showEdit: true,
            primaryButtons,
            secondaryButtons,
            destructiveButtons,
          }
        }
        case 'in_edition': {
          return {
            showEdit: true,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [
              {
                label: 'Excluir',
                action: () => setShowDeleteDialog(true),
                variant: 'destructive' as const,
                icon: Trash2,
              },
            ],
          }
        }
        case 'awaiting_approval':
          return {
            showEdit: true,
            primaryButtons: [
              {
                label: 'Aprovar e publicar',
                action: () => setShowApproveDialog(true),
                variant: 'default' as const,
              },
            ],
            secondaryButtons: [
              {
                label: 'Enviar para edição',
                action: () => setShowSendToEditDialog(true),
                variant: 'outline' as const,
                icon: Edit,
              },
            ],
            destructiveButtons: [
              {
                label: 'Excluir',
                action: () => setShowDeleteDialog(true),
                variant: 'destructive' as const,
                icon: Trash2,
              },
            ],
          }
        default: {
          return {
            showEdit: true,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [
              {
                label: 'Excluir',
                action: () => setShowDeleteDialog(true),
                variant: 'destructive' as const,
                icon: Trash2,
              },
            ],
          }
        }
      }
    }

    // Editor users (busca:services:editor) have restricted permissions
    if (canEditServices) {
      switch (status) {
        case 'published':
          // CRITICAL: Editors cannot edit published services
          return {
            showEdit: false,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [],
          }
        case 'in_edition':
          return {
            showEdit: true,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [],
          }
        case 'awaiting_approval':
          // CRITICAL: Editors cannot edit or send to edition services awaiting approval
          return {
            showEdit: false,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [],
          }
        default:
          return {
            showEdit: false,
            primaryButtons: [],
            secondaryButtons: [],
            destructiveButtons: [],
          }
      }
    }

    // For any other roles or no permissions
    return {
      showEdit: false,
      primaryButtons: [],
      secondaryButtons: [],
      destructiveButtons: [],
    }
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
      <UnsavedChangesGuard
        hasUnsavedChanges={isEditing && hasFormChanges}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />
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
          <div className="space-y-4">
            <div className="flex items-start md:items-center justify-between md:flex-row flex-col gap-4 md:gap-6">
              <div className="flex-1 min-w-0">
                {service.status === 'published' &&
                service.serviceCategory &&
                service.slug ? (
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`${process.env.NEXT_PUBLIC_BASE_URL_APP || ''}/servicos/categoria/${service.serviceCategory}/${service.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline group"
                        >
                          <span>
                            {service.title}{' '}
                            <LinkIcon
                              strokeWidth={1.5}
                              className="inline h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors align-middle ml-1"
                            />
                          </span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">
                          Acesse o serviço no pref.rio
                        </p>
                        <p className="text-xs text-muted/70">
                          Alterações levam 10 minutos para serem refletidas.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </h1>
                ) : (
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">
                    {service.title}
                  </h1>
                )}
                <div className="flex flex-nowrap items-center gap-2 mt-2">
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
              </div>
              <div className="flex w-full max-w-none flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end mt-4 md:mt-0 sm:max-w-md ml-auto">
                {(() => {
                  const buttonConfig = getButtonConfiguration()

                  if (!isEditing) {
                    return (
                      <>
                        {/* Primary Actions - Most important actions first */}
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

                        {/* Secondary Actions - Preview and administrative actions */}
                        <Button
                          variant="secondary"
                          onClick={() => setShowPreviewModal(true)}
                          disabled={loading || operationLoading}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Pré-visualizar
                        </Button>

                        {buttonConfig.primaryButtons.map((button, index) => (
                          <Button
                            key={`primary-${index}`}
                            onClick={button.action}
                            disabled={loading || operationLoading || isSaving}
                            variant={button.variant || 'default'}
                            className="w-full sm:w-auto"
                          >
                            {button.icon &&
                              React.createElement(button.icon, {
                                className: 'h-4 w-4 mr-2',
                              })}
                            {button.label}
                          </Button>
                        ))}

                        {/* Secondary and Destructive Actions - Show directly on mobile, dropdown on desktop */}
                        {(buttonConfig.secondaryButtons.length > 0 ||
                          buttonConfig.destructiveButtons.length > 0) && (
                          <>
                            {/* Mobile: Show buttons directly */}
                            <div className="flex flex-col sm:hidden gap-2 w-full">
                              {buttonConfig.secondaryButtons.map(
                                (button, index) => (
                                  <Button
                                    key={`secondary-mobile-${index}`}
                                    onClick={button.action}
                                    disabled={
                                      loading || operationLoading || isSaving
                                    }
                                    variant={button.variant || 'outline'}
                                    className={`w-full ${button.className ?? ''}`}
                                  >
                                    {button.icon &&
                                      React.createElement(button.icon, {
                                        className: 'h-4 w-4 mr-2',
                                      })}
                                    {button.label}
                                  </Button>
                                )
                              )}
                              {buttonConfig.destructiveButtons.map(
                                (button, index) => (
                                  <Button
                                    key={`destructive-mobile-${index}`}
                                    onClick={button.action}
                                    disabled={
                                      loading || operationLoading || isSaving
                                    }
                                    variant={button.variant || 'outline'}
                                    className="w-full"
                                  >
                                    {button.icon &&
                                      React.createElement(button.icon, {
                                        className: 'h-4 w-4 mr-2',
                                      })}
                                    {button.label}
                                  </Button>
                                )
                              )}
                            </div>
                            {/* Desktop: Show dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  disabled={
                                    loading || operationLoading || isSaving
                                  }
                                  className="hidden sm:flex"
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                  <span className="sr-only">Mais opções</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {buttonConfig.secondaryButtons.map(
                                  (button, index) => (
                                    <DropdownMenuItem
                                      key={`secondary-${index}`}
                                      onClick={button.action}
                                      disabled={
                                        loading || operationLoading || isSaving
                                      }
                                      variant="default"
                                      className="cursor-pointer"
                                    >
                                      {button.icon &&
                                        React.createElement(button.icon, {
                                          className: 'h-4 w-4 mr-2',
                                        })}
                                      {button.label}
                                    </DropdownMenuItem>
                                  )
                                )}
                                {buttonConfig.destructiveButtons.map(
                                  (button, index) => (
                                    <DropdownMenuItem
                                      key={`destructive-${index}`}
                                      onClick={button.action}
                                      disabled={
                                        loading || operationLoading || isSaving
                                      }
                                      variant={
                                        button.variant === 'destructive'
                                          ? 'destructive'
                                          : 'default'
                                      }
                                      className="cursor-pointer"
                                    >
                                      {button.icon &&
                                        React.createElement(button.icon, {
                                          className: 'h-4 w-4 mr-2',
                                        })}
                                      {button.label}
                                    </DropdownMenuItem>
                                  )
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </>
                    )
                  }

                  return (
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end w-full sm:w-auto">
                      <Button
                        type="button"
                        form="service-edit-form"
                        disabled={
                          isSaving || operationLoading || !hasFormChanges
                        }
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
            {/* Date information - extends full width */}
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-muted-foreground">
              <span>
                Última modificação em{' '}
                {format(
                  service.last_update || new Date(),
                  'dd/MM/yyyy HH:mm:ss',
                  {
                    locale: ptBR,
                  }
                )}
              </span>
              {service.published_at && (
                <>
                  <span className="hidden md:inline-block h-4 w-px bg-border mx-1" />
                  <span>
                    Publicado em{' '}
                    {format(service.published_at, 'dd/MM/yyyy HH:mm:ss', {
                      locale: ptBR,
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tombamento Information Card */}
        {isServiceTombado &&
          serviceTombamentos.map(tombamento => (
            <TombadoServiceInfo
              key={tombamento.id}
              origem={tombamento.origem}
              idServicoAntigo={tombamento.id_servico_antigo}
              criadoEm={tombamento.criado_em}
              criadoPor={tombamento.criado_por}
              observacoes={tombamento.observacoes}
            />
          ))}

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" disabled={isEditing && hasFormChanges}>
              Detalhes do serviço
            </TabsTrigger>
            <TabsTrigger value="history" disabled={isEditing && hasFormChanges}>
              Histórico de modificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <NewServiceForm
              readOnly={!isEditing}
              isLoading={isSaving || operationLoading}
              onSubmit={isEditing ? handleSaveClick : undefined}
              serviceStatus={service.status}
              onSendToApproval={handleSendToApproval}
              onPublish={handleApproveAndPublish}
              onSave={async () => {
                // For already published services, just refetch without publishing again
                // Don't show toast here - updateService already shows "Serviço atualizado com sucesso!"
                await refetch()
              }}
              serviceId={servicoId || undefined}
              onFormChangesDetected={setHasFormChanges}
              initialData={initialFormData ?? undefined}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {servicoId && (
              <ServiceVersionHistory
                serviceId={servicoId}
                onRollbackSuccess={refetch}
              />
            )}
          </TabsContent>
        </Tabs>

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
          description="Tem certeza que deseja aprovar e publicar este serviço? Ele ficará disponível no para todos os cidadãos no pref.rio."
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
          description={
            service?.status === 'published'
              ? 'Tem certeza que deseja salvar as alterações realizadas no serviço? Esse serviço já está publicado e as alterações aparecerão imediatamente no pref.rio.'
              : 'Tem certeza que deseja salvar as alterações realizadas no serviço?'
          }
          confirmText="Salvar alterações"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleConfirmSave}
        />

        <ConfirmDialog
          open={showDestombamentoDialog}
          onOpenChange={setShowDestombamentoDialog}
          title="Destombar Serviço"
          description={`Tem certeza que deseja destombar este serviço? Isso irá reverter a migração e o serviço antigo voltará a aparecer normalmente.${
            serviceTombamentos.length > 1
              ? ` Este serviço tem ${serviceTombamentos.length} tombamentos registrados; todos serão removidos.`
              : ''
          }`}
          confirmText="Destombar"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleConfirmDestombamento}
        />

        <ConfirmDialog
          open={showTabChangeDialog}
          onOpenChange={setShowTabChangeDialog}
          title="Alterações não salvas"
          description="Você tem alterações não salvas. Tem certeza que deseja mudar de aba? As alterações serão perdidas."
          confirmText="Mudar de aba"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleConfirmTabChange}
          onCancel={handleCancelTabChange}
        />

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Excluir Serviço"
          description={`Tem certeza que deseja excluir o serviço "${service?.title}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleDeleteService}
        />

        <ConfirmDialog
          open={showUnpublishDialog}
          onOpenChange={setShowUnpublishDialog}
          title="Despublicar Serviço"
          description={`Tem certeza que deseja despublicar o serviço "${service?.title}"? Ele deixará de estar disponível para os cidadãos.`}
          confirmText="Despublicar"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleUnpublishService}
        />

        {/* Tombamento Modal */}
        {servicoId && service && (
          <TombamentoModal
            open={showTombamentoModal}
            onOpenChange={setShowTombamentoModal}
            serviceId={servicoId}
            serviceTitle={service.title}
            onSuccess={handleTombamentoSuccess}
            onDuplicate={checkTombamento}
          />
        )}

        {/* Preview Modal */}
        {service && initialFormData && (
          <ServicePreviewModal
            open={showPreviewModal}
            onOpenChange={setShowPreviewModal}
            serviceData={mapFormDataToPreview({
              ...initialFormData,
              serviceSubcategory: initialFormData.serviceSubcategory || '',
            })}
            orgaoGestorName={department?.nome_ua || null}
          />
        )}
      </div>
    </ContentLayout>
  )
}
