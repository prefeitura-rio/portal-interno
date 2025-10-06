'use client'

import {
  NewMEIOpportunityForm,
  type NewMEIOpportunityFormRef,
} from '@/app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form'
import { ProposalsTable } from '@/app/(private)/(app)/gorio/oportunidades-mei/components/proposals-table'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMEIOpportunity } from '@/hooks/use-mei-opportunity'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ClipboardList,
  Edit,
  FileText,
  Flag,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Status configuration for badges
const statusConfig: Record<string, any> = {
  draft: {
    icon: FileText,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  active: {
    icon: ClipboardList,
    label: 'Ativa',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  expired: {
    icon: Flag,
    label: 'Expirada',
    variant: 'outline',
    className: 'text-gray-500 border-gray-200 bg-gray-50',
  },
}

export default function MEIOpportunityDetailPage({
  params,
}: { params: Promise<{ 'oportunidade-mei-id': string }> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [opportunityId, setOpportunityId] = useState<number | null>(null)

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'delete_opportunity' | 'save_changes' | 'publish_opportunity' | null
  }>({
    open: false,
    type: null,
  })

  // Refs to trigger form submission
  const draftFormRef = useRef<NewMEIOpportunityFormRef>(null)
  const opportunityFormRef = useRef<NewMEIOpportunityFormRef>(null)

  // Use the custom hook to fetch opportunity data
  const { opportunity, loading, error, refetch } = useMEIOpportunity(
    opportunityId?.toString() || null
  )

  // Debug logging
  useEffect(() => {
    if (opportunity) {
      console.log('Opportunity data received:', opportunity)
      console.log('Opportunity status:', opportunity.status)
    }
  }, [opportunity])

  // Handle async params
  useEffect(() => {
    params.then(resolvedParams => {
      setOpportunityId(Number(resolvedParams['oportunidade-mei-id']))
    })
  }, [params])

  // Function to update URL with tab parameter
  const updateTabInUrl = useCallback(
    (newTab: string) => {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('tab', newTab)

      // Use router.replace to update URL without adding to history
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    },
    [router]
  )

  // Auto-enable edit mode if edit=true query parameter is present
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam === 'true') {
      setIsEditing(true)
    }

    // Set active tab from URL parameter
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'about' || tabParam === 'proposals')) {
      setActiveTab(tabParam)
    } else if (!tabParam && opportunity && opportunity.status !== 'draft') {
      // Set default tab for non-draft opportunities if no tab param exists
      updateTabInUrl('about')
    }
  }, [searchParams, opportunity, updateTabInUrl])

  // Handler for tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    updateTabInUrl(newTab)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setActiveTab('about')
    updateTabInUrl('about')
  }

  const handleSave = async (data: any) => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const updateData = {
        ...data,
        title: data.title || opportunity?.title,
        activity_type: data.activity_type || opportunity?.activity_type,
        activity_specification:
          data.activity_specification || opportunity?.activity_specification,
        description: data.description || opportunity?.description,
        execution_location:
          data.execution_location || opportunity?.execution_location,
        address: data.address || opportunity?.address,
        number: data.number || opportunity?.number,
        neighborhood: data.neighborhood || opportunity?.neighborhood,
        opportunity_expiration_date:
          data.opportunity_expiration_date ||
          opportunity?.opportunity_expiration_date,
        service_execution_deadline:
          data.service_execution_deadline ||
          opportunity?.service_execution_deadline,
        gallery_images: data.gallery_images || opportunity?.gallery_images,
        cover_image: data.cover_image || opportunity?.cover_image,
        orgao_id:
          (data.orgao as any)?.id || data.orgao_id || opportunity?.orgao_id,
      }

      // Mock API call - replace with actual implementation
      console.log('Saving opportunity:', updateData)
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Oportunidade salva com sucesso!')
      setIsEditing(false)

      // Refetch opportunity data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
      toast.error('Erro ao salvar oportunidade', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async (data: any) => {
    try {
      setIsLoading(true)

      // Ensure required fields are always included
      const publishData = {
        ...data,
        title: data.title || opportunity?.title,
        activity_type: data.activity_type || opportunity?.activity_type,
        activity_specification:
          data.activity_specification || opportunity?.activity_specification,
        description: data.description || opportunity?.description,
        execution_location:
          data.execution_location || opportunity?.execution_location,
        address: data.address || opportunity?.address,
        number: data.number || opportunity?.number,
        neighborhood: data.neighborhood || opportunity?.neighborhood,
        opportunity_expiration_date:
          data.opportunity_expiration_date ||
          opportunity?.opportunity_expiration_date,
        service_execution_deadline:
          data.service_execution_deadline ||
          opportunity?.service_execution_deadline,
        gallery_images: data.gallery_images || opportunity?.gallery_images,
        cover_image: data.cover_image || opportunity?.cover_image,
        orgao_id:
          (data.orgao as any)?.id || data.orgao_id || opportunity?.orgao_id,
        status: 'active',
      }

      // Mock API call - replace with actual implementation
      console.log('Publishing opportunity:', publishData)
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Oportunidade publicada com sucesso!')
      setIsEditing(false)

      // Refetch opportunity data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error publishing opportunity:', error)
      toast.error('Erro ao publicar oportunidade', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDraft = async (data: any) => {
    try {
      setIsLoading(true)

      const draftData = {
        ...data,
        status: 'draft',
      }

      // Mock API call - replace with actual implementation
      console.log('Saving draft:', draftData)
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Rascunho salvo com sucesso!')
      setIsEditing(false)

      // Refetch opportunity data to get updated information
      if (refetch) {
        refetch()
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishFromHeader = () => {
    // Trigger form validation and publish
    if (isDraft) {
      draftFormRef.current?.triggerPublish()
    } else {
      opportunityFormRef.current?.triggerPublish()
    }
  }

  const handleSaveDraftFromHeader = () => {
    // For drafts, use triggerSaveDraft; for non-drafts, use triggerSubmit
    if (isDraft) {
      draftFormRef.current?.triggerSaveDraft()
    } else {
      opportunityFormRef.current?.triggerSubmit()
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleDeleteOpportunity = () => {
    setConfirmDialog({
      open: true,
      type: 'delete_opportunity',
    })
  }

  const confirmDeleteOpportunity = async () => {
    try {
      setIsLoading(true)

      // Mock API call - replace with actual implementation
      console.log('Deleting opportunity:', opportunityId)
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Oportunidade excluída com sucesso!')

      // Redirect to opportunities list
      router.push('/gorio/oportunidades-mei')
    } catch (error) {
      console.error('Error deleting opportunity:', error)
      toast.error('Erro ao excluir oportunidade', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state
  if (loading || !opportunityId) {
    return (
      <ContentLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando oportunidade...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  // Show error state
  if (error || !opportunity) {
    return (
      <ContentLayout title="Erro">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Flag className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Erro ao carregar oportunidade
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Oportunidade não encontrada'}
            </p>
            <Link href="/gorio/oportunidades-mei">
              <Button>Voltar para Oportunidades MEI</Button>
            </Link>
          </div>
        </div>
      </ContentLayout>
    )
  }

  const config =
    statusConfig[opportunity.status as keyof typeof statusConfig] ||
    statusConfig.draft
  const StatusIcon = config.icon

  // Use originalStatus for business logic, fallback to status if originalStatus not available
  const actualStatus = opportunity.status as string
  console.log('actualStatus', actualStatus)

  // Check if opportunity is a draft
  const isDraft = actualStatus === 'draft'

  return (
    <ContentLayout title="Detalhes da Oportunidade MEI">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>GO Rio</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/oportunidades-mei">Oportunidades MEI</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{opportunity.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between md:flex-row flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {opportunity.title}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge
                  variant={config.variant}
                  className={`capitalize ${config.className}`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                <div className="flex flex-row gap-4">
                  <span className="text-sm text-muted-foreground">
                    Criado em:{' '}
                    {format(
                      new Date(opportunity.created_at) || new Date(),
                      'dd/MM/yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Expira em:{' '}
                    {format(
                      new Date(opportunity.opportunity_expiration_date) ||
                        new Date(),
                      'dd/MM/yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Show action buttons based on opportunity status */}
              {!isEditing ? (
                <>
                  {/* Edit button - don't show for expired opportunities when not in proposals tab */}
                  {actualStatus !== 'expired' && (
                    <Button
                      onClick={handleEdit}
                      disabled={activeTab === 'proposals' || isLoading}
                      className="w-full md:w-auto"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}

                  {/* Delete Opportunity button - show for all statuses */}
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOpportunity}
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir oportunidade
                  </Button>
                </>
              ) : (
                <>
                  {isDraft && (
                    <Button
                      onClick={handlePublishFromHeader}
                      disabled={isLoading}
                      className="w-full md:w-auto"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salvar e Publicar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleSaveDraftFromHeader}
                    disabled={isLoading}
                    className="w-full md:w-auto"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isDraft ? 'Salvar Rascunho' : 'Salvar alterações'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="w-full md:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Conditional rendering based on opportunity status */}
        {isDraft ? (
          // For draft opportunities, show only the form without tabs
          <div className="mt-6">
            <div className={isEditing ? '' : 'pointer-events-none opacity-90'}>
              <NewMEIOpportunityForm
                ref={draftFormRef}
                initialData={opportunity as any}
                isReadOnly={!isEditing}
                onSubmit={handleSave}
                onPublish={handlePublish}
                onSaveDraft={handleSaveDraft}
                isDraft={isDraft}
                opportunityStatus={opportunity.status as string}
              />
            </div>
          </div>
        ) : (
          // For non-draft opportunities, show tabs
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="about">Sobre a oportunidade</TabsTrigger>
              <TabsTrigger value="proposals" disabled={isEditing}>
                Propostas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              {/* Opportunity Form */}
              <div
                className={isEditing ? '' : 'pointer-events-none opacity-90'}
              >
                <NewMEIOpportunityForm
                  ref={opportunityFormRef}
                  initialData={opportunity as any}
                  isReadOnly={!isEditing}
                  onSubmit={handleSave}
                  onPublish={handlePublish}
                  onSaveDraft={handleSaveDraft}
                  isDraft={isDraft}
                  opportunityStatus={opportunity.status as string}
                />
              </div>
            </TabsContent>

            <TabsContent value="proposals" className="mt-6">
              <ProposalsTable
                opportunityId={opportunityId}
                opportunityTitle={opportunity.title}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
        title={
          confirmDialog.type === 'delete_opportunity'
            ? 'Excluir Oportunidade'
            : confirmDialog.type === 'save_changes'
              ? 'Salvar Alterações'
              : confirmDialog.type === 'publish_opportunity'
                ? 'Publicar Oportunidade'
                : 'Confirmar Ação'
        }
        description={
          confirmDialog.type === 'delete_opportunity'
            ? `Tem certeza que deseja excluir a oportunidade "${opportunity.title}"? Esta ação não pode ser desfeita.`
            : confirmDialog.type === 'save_changes'
              ? `Tem certeza que deseja salvar as alterações na oportunidade "${opportunity.title}"?`
              : confirmDialog.type === 'publish_opportunity'
                ? `Tem certeza que deseja publicar a oportunidade "${opportunity.title}"? Esta ação tornará a oportunidade visível.`
                : 'Tem certeza que deseja realizar esta ação?'
        }
        confirmText={
          confirmDialog.type === 'delete_opportunity'
            ? 'Excluir Oportunidade'
            : confirmDialog.type === 'save_changes'
              ? 'Salvar Alterações'
              : confirmDialog.type === 'publish_opportunity'
                ? 'Publicar Oportunidade'
                : 'Confirmar'
        }
        variant={
          confirmDialog.type === 'delete_opportunity'
            ? 'destructive'
            : 'default'
        }
        onConfirm={() => {
          if (confirmDialog.type === 'delete_opportunity') {
            confirmDeleteOpportunity()
          } else if (confirmDialog.type === 'save_changes') {
            // Trigger form submission
            if (isDraft) {
              draftFormRef.current?.triggerSubmit()
            } else {
              opportunityFormRef.current?.triggerSubmit()
            }
          } else if (confirmDialog.type === 'publish_opportunity') {
            // Trigger form publication
            if (isDraft) {
              draftFormRef.current?.triggerPublish()
            } else {
              opportunityFormRef.current?.triggerPublish()
            }
          }
        }}
      />
    </ContentLayout>
  )
}
