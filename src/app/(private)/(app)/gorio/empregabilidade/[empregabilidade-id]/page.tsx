'use client'

import { CandidatesTable } from '@/app/(private)/(app)/gorio/components/candidates-table'
import { NewCandidateDialog } from '@/app/(private)/(app)/gorio/empregabilidade/components/new-candidate-dialog'
import {
  NewEmpregabilidadeForm,
  type NewEmpregabilidadeFormRef,
} from '@/app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useVaga } from '@/hooks/use-vaga'
import { fromApiInformacaoComplementar } from '@/lib/converters/empregabilidade'
import {
  type VagaStatus,
  vagaStatusConfig,
} from '@/lib/status-config/empregabilidade'
import {
  canDeleteVagaWithStatus,
  hasEditorComCuradoriaRestrictions,
} from '@/types/heimdall-roles'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Ban,
  Edit,
  EllipsisVertical,
  Pause,
  Play,
  RefreshCw,
  Save,
  Square,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export default function EmpregabilidadeDetailPage({
  params,
}: { params: Promise<{ 'empregabilidade-id': string }> }) {
  // Router and search params (must be at the top)
  const searchParams = useSearchParams()
  const router = useRouter()
  const {
    user,
    hasEmpregoTrabalhoAccess,
    canPublishVagaAsAtivo,
    canFreezeOrDiscontinueVaga,
  } = useHeimdallUserContext()

  const canEditVagas = hasEmpregoTrabalhoAccess
  const hasEditorRestrictions = hasEditorComCuradoriaRestrictions(user?.roles)

  // All state hooks (must be in consistent order)
  const [vagaId, setVagaId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [showNewCandidateDialog, setShowNewCandidateDialog] = useState(false)
  const [candidatesRefreshKey, setCandidatesRefreshKey] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'delete' | 'publish' | 'freeze' | 'discontinue' | null
  }>({
    open: false,
    type: null,
  })
  const [showReactivateExpiredDialog, setShowReactivateExpiredDialog] =
    useState(false)
  const [pendingExpiredFormData, setPendingExpiredFormData] =
    useState<any>(null)

  // Ref to trigger form submission
  const formRef = useRef<NewEmpregabilidadeFormRef>(null)

  // Use the custom hook to fetch vaga data
  const { vaga, loading, error, refetch } = useVaga(vagaId)

  // Handle async params - set vagaId
  useEffect(() => {
    params.then(resolvedParams => {
      setVagaId(resolvedParams['empregabilidade-id'])
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

  // Handler for tab change - intercept if editing with unsaved changes
  const handleTabChange = useCallback(
    (newTab: string) => {
      if (isEditing && hasUnsavedChanges) {
        setPendingTab(newTab)
        setShowTabChangeDialog(true)
      } else {
        setActiveTab(newTab)
        updateTabInUrl(newTab)
      }
    },
    [isEditing, hasUnsavedChanges, updateTabInUrl]
  )

  // Handler for confirming tab change with unsaved changes
  const handleConfirmTabChange = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab)
      updateTabInUrl(pendingTab)
      setPendingTab(null)
      setShowTabChangeDialog(false)
      setIsEditing(false)
      setHasUnsavedChanges(false)
      refetch() // Reload original data
    }
  }, [pendingTab, updateTabInUrl, refetch])

  // Handle form changes detection
  const handleFormChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges)
  }, [])

  // Handle save - trigger form submission (for published vagas or general save)
  const handleSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.triggerSubmit()
    }
  }, [])

  // Handle save as draft - trigger draft save (for em_edicao status)
  const handleSaveDraft = useCallback(() => {
    if (formRef.current) {
      formRef.current.triggerSaveDraft()
    }
  }, [])

  // Handle save and publish - save draft then publish
  const handleSaveAndPublish = useCallback(() => {
    if (formRef.current) {
      formRef.current.triggerSaveAndPublish()
    }
  }, [])

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (
        confirm(
          'Você tem alterações não salvas. Deseja realmente cancelar a edição?'
        )
      ) {
        setIsEditing(false)
        setHasUnsavedChanges(false)
        refetch() // Reload original data
      }
    } else {
      setIsEditing(false)
    }
  }, [hasUnsavedChanges, refetch])

  // Handle delete
  const handleDelete = useCallback(() => {
    setConfirmDialog({ open: true, type: 'delete' })
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!vaga?.id) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/empregabilidade/vagas/${vaga.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir vaga')
      }

      toast.success('Vaga excluída com sucesso!')
      router.push('/gorio/empregabilidade')
    } catch (error) {
      console.error('Error deleting vaga:', error)
      toast.error('Erro ao excluir vaga')
      setIsLoading(false)
    }
    // Don't set isLoading to false here - we're navigating away
  }, [vaga, router])

  // Handle publish
  const handlePublish = useCallback(() => {
    setConfirmDialog({ open: true, type: 'publish' })
  }, [])

  // Handle freeze (pausar vaga)
  const handleFreeze = useCallback(() => {
    setConfirmDialog({ open: true, type: 'freeze' })
  }, [])

  // Handle discontinue (encerrar vaga)
  const handleDiscontinue = useCallback(() => {
    setConfirmDialog({ open: true, type: 'discontinue' })
  }, [])

  const confirmPublish = useCallback(async () => {
    if (!vaga?.id) return

    // Validate required fields before publishing
    const requiredFields = [
      { field: 'titulo', label: 'Título' },
      { field: 'descricao', label: 'Descrição' },
      { field: 'id_contratante', label: 'Empresa' },
      { field: 'id_regime_contratacao', label: 'Regime de Contratação' },
      { field: 'id_modelo_trabalho', label: 'Modelo de Trabalho' },
    ]

    const missingFields = requiredFields.filter(({ field }) => {
      const value = vaga?.[field as keyof typeof vaga]
      return !value || (typeof value === 'string' && value.trim() === '')
    })

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => f.label).join(', ')
      toast.error('Campos obrigatórios faltando', {
        description: `Complete os seguintes campos antes de publicar: ${missingLabels}`,
      })
      setConfirmDialog({ open: false, type: null })
      return
    }

    setIsLoading(true)
    setConfirmDialog({ open: false, type: null })

    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/publish`,
        {
          method: 'PUT',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao publicar vaga')
      }

      toast.success('Vaga publicada com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error publishing vaga:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao publicar vaga'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  const confirmFreeze = useCallback(async () => {
    if (!vaga?.id) return
    setIsLoading(true)
    setConfirmDialog({ open: false, type: null })
    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/freeze`,
        { method: 'PUT' }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao pausar vaga')
      }
      toast.success('Vaga pausada com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error freezing vaga:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao pausar vaga'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  const confirmDiscontinue = useCallback(async () => {
    if (!vaga?.id) return
    setIsLoading(true)
    setConfirmDialog({ open: false, type: null })
    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/discontinue`,
        { method: 'PUT' }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao encerrar vaga')
      }
      toast.success('Vaga encerrada com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error discontinuing vaga:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao encerrar vaga'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  const handleReactivate = useCallback(async () => {
    if (!vaga?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/reactivate`,
        { method: 'PUT' }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao reativar vaga')
      }
      toast.success('Vaga reativada com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error reactivating vaga:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao reativar vaga'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  const handleUnfreeze = useCallback(async () => {
    if (!vaga?.id) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/unfreeze`,
        { method: 'PUT' }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao descongelar vaga')
      }
      toast.success('Vaga descongelada com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error unfreezing vaga:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao descongelar vaga'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  // Handle send to approval (status -> em_aprovacao)
  const handleSendToApproval = useCallback(async () => {
    if (!vaga?.id) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/send-to-approval`,
        {
          method: 'PUT',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.error || 'Erro ao enviar vaga para aprovação'
        )
      }

      toast.success('Vaga enviada para aprovação com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error sending vaga to approval:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao enviar vaga para aprovação'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  // Handle send to draft/edition (status -> em_edicao)
  const handleSendToDraft = useCallback(async () => {
    if (!vaga?.id) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/empregabilidade/vagas/${vaga.id}/send-to-draft`,
        {
          method: 'PUT',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.error || 'Erro ao enviar vaga para edição (rascunho)'
        )
      }

      toast.success('Vaga enviada para edição (rascunho) com sucesso!')
      await refetch()
    } catch (error) {
      console.error('Error sending vaga to draft:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao enviar vaga para edição'
      )
    } finally {
      setIsLoading(false)
    }
  }, [vaga, refetch])

  // Helper function to map form data to API format
  const mapFormToApiData = useCallback(
    (data: any) => {
      const {
        contratante,
        regime_contratacao,
        modelo_trabalho,
        tipo_pcd,
        vaga_pcd,
        acessibilidade_pcd,
        ...rest
      } = data

      const tipoPcdIds = tipo_pcd ?? []
      const tiposPcdForApi =
        tipoPcdIds.length > 0
          ? tipoPcdIds.map((id: string) => ({ id }))
          : undefined

      return {
        ...rest,
        id_contratante: contratante || vaga?.id_contratante,
        id_regime_contratacao:
          regime_contratacao || vaga?.id_regime_contratacao,
        id_modelo_trabalho: modelo_trabalho || vaga?.id_modelo_trabalho,
        acessibilidade_pcd: vaga_pcd ? acessibilidade_pcd : undefined,
        tipos_pcd: tiposPcdForApi,
      }
    },
    [vaga]
  )

  // Helper to persist form data (for published vagas - validação já feita no form)
  const saveVagaData = useCallback(
    async (data: any) => {
      if (!vaga?.id) return

      setIsLoading(true)

      try {
        const apiData = mapFormToApiData(data)

        const response = await fetch(`/api/empregabilidade/vagas/${vaga.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao salvar vaga')
        }

        toast.success('Vaga atualizada com sucesso!')
        setIsEditing(false)
        setHasUnsavedChanges(false)
        await refetch()
      } catch (error) {
        console.error('Error saving vaga:', error)
        toast.error(
          error instanceof Error ? error.message : 'Erro ao salvar vaga'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [vaga, refetch, mapFormToApiData]
  )

  // Get status config and read-only flag for editor_com_curadoria
  const statusData = vaga?.status
    ? vagaStatusConfig[vaga.status as VagaStatus]
    : null
  const StatusIcon = statusData?.icon

  const isReadOnlyForEditor =
    hasEditorRestrictions &&
    (vaga?.status === 'publicado_ativo' ||
      vaga?.status === 'publicado_expirado' ||
      vaga?.status === 'vaga_congelada' ||
      vaga?.status === 'vaga_descontinuada')

  // Handle form submission (for published vagas - valida 11 campos)
  const handleFormSubmit = useCallback(
    async (data: any) => {
      if (!vaga?.id) return

      // Regra especial para vaga expirada:
      // se status atual for publicado_expirado e nova data_limite for futura,
      // exibir modal avisando que a vaga voltará a ficar ativa para o cidadão.
      if (
        vaga.status === 'publicado_expirado' &&
        data?.data_limite instanceof Date &&
        data.data_limite.getTime() > new Date().getTime()
      ) {
        setPendingExpiredFormData(data)
        setShowReactivateExpiredDialog(true)
        return
      }

      await saveVagaData(data)
    },
    [vaga, saveVagaData]
  )

  const handleConfirmReactivateExpired = useCallback(async () => {
    if (!pendingExpiredFormData) {
      setShowReactivateExpiredDialog(false)
      return
    }

    await saveVagaData(pendingExpiredFormData)
    setPendingExpiredFormData(null)
    setShowReactivateExpiredDialog(false)
  }, [pendingExpiredFormData, saveVagaData])

  // Handle save as draft (for em_edicao - validates 5 fields only)
  const handleFormSaveDraft = useCallback(
    async (data: any) => {
      if (!vaga?.id) return

      setIsLoading(true)

      try {
        const apiData = mapFormToApiData(data)

        const response = await fetch(`/api/empregabilidade/vagas/${vaga.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...apiData, _saveAsDraft: true }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao salvar rascunho')
        }

        toast.success('Rascunho salvo com sucesso!')
        setIsEditing(false)
        setHasUnsavedChanges(false)
        await refetch()
      } catch (error) {
        console.error('Error saving draft:', error)
        toast.error(
          error instanceof Error ? error.message : 'Erro ao salvar rascunho'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [vaga, refetch, mapFormToApiData]
  )

  // Handle save and publish (validates 11 fields, saves then publishes)
  const handleFormSaveAndPublish = useCallback(
    async (data: any) => {
      if (!vaga?.id) return

      setIsLoading(true)

      try {
        const apiData = mapFormToApiData(data)

        // First save the vaga
        const saveResponse = await fetch(
          `/api/empregabilidade/vagas/${vaga.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiData),
          }
        )

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          throw new Error(errorData.error || 'Erro ao salvar vaga')
        }

        // Then publish
        const publishResponse = await fetch(
          `/api/empregabilidade/vagas/${vaga.id}/publish`,
          {
            method: 'PUT',
          }
        )

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json()
          throw new Error(errorData.error || 'Erro ao publicar vaga')
        }

        toast.success('Vaga salva e publicada com sucesso!')
        setIsEditing(false)
        setHasUnsavedChanges(false)
        await refetch()
      } catch (error) {
        console.error('Error saving and publishing:', error)
        toast.error(
          error instanceof Error ? error.message : 'Erro ao salvar e publicar'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [vaga, refetch, mapFormToApiData]
  )

  // Auto-enable edit mode if edit=true query parameter is present
  useEffect(() => {
    const editParam = searchParams.get('edit')

    if (editParam === 'true' && canEditVagas && !isReadOnlyForEditor) {
      setIsEditing(true)
    }

    if (isReadOnlyForEditor) {
      setIsEditing(false)
    }

    // Set active tab from URL parameter
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'about' || tabParam === 'candidates')) {
      setActiveTab(tabParam)
    } else if (!tabParam) {
      // Set default tab if no tab param exists
      updateTabInUrl('about')
    }
  }, [searchParams, updateTabInUrl, canEditVagas, isReadOnlyForEditor])

  // Show loading state
  if (loading || !vagaId) {
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
  if (error || !vaga) {
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

  // Map vaga data to form format
  const formData = {
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    contratante: vaga.id_contratante,
    regime_contratacao: vaga.id_regime_contratacao,
    modelo_trabalho: vaga.id_modelo_trabalho,
    vaga_pcd: !!(
      vaga.acessibilidade_pcd ||
      (vaga.tipos_pcd && vaga.tipos_pcd.length > 0)
    ),
    acessibilidade_pcd: vaga.acessibilidade_pcd ?? undefined,
    tipo_pcd: vaga.tipos_pcd?.map(t => t.id || '') || [],
    valor_vaga: vaga.valor_vaga,
    bairro: vaga.bairro,
    data_limite: vaga.data_limite ? new Date(vaga.data_limite) : undefined,
    requisitos: vaga.requisitos,
    diferenciais: vaga.diferenciais,
    responsabilidades: vaga.responsabilidades,
    beneficios: vaga.beneficios,
    etapas: (vaga.etapas as any) || [],
    informacoes_complementares: fromApiInformacaoComplementar(
      vaga.informacoes_complementares
    ),
    id_orgao_parceiro: vaga.id_orgao_parceiro,
  }

  return (
    <ContentLayout title="Detalhes da Vaga">
      <UnsavedChangesGuard
        hasUnsavedChanges={hasUnsavedChanges && isEditing}
        allowNavigation={isLoading}
        message="Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas."
      />

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
                <BreadcrumbPage>{vaga.titulo || 'Detalhes'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {vaga.titulo || 'Vaga de Emprego'}
              </h1>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {statusData && (
                  <Badge
                    variant="outline"
                    className={`${statusData.className} capitalize`}
                  >
                    {StatusIcon && <StatusIcon className="mr-1 h-3 w-3" />}
                    {statusData.label}
                  </Badge>
                )}
                {vaga.created_at && (
                  <span className="text-sm text-muted-foreground">
                    Criada em{' '}
                    {format(new Date(vaga.created_at), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                )}
                {vaga.contratante?.nome_fantasia && (
                  <span className="text-sm text-muted-foreground">
                    {vaga.contratante.nome_fantasia}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {canEditVagas && !isReadOnlyForEditor && (
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    {/* Primary (always visible) buttons by status */}
                    {vaga.status === 'em_edicao' && (
                      <Button
                        onClick={handleSendToApproval}
                        disabled={isLoading}
                        variant="default"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Enviar para aprovação
                      </Button>
                    )}

                    {vaga.status === 'em_aprovacao' &&
                      canPublishVagaAsAtivo && (
                        <Button
                          onClick={handlePublish}
                          disabled={isLoading}
                          variant="default"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Publicar vaga
                        </Button>
                      )}

                    {vaga.status === 'vaga_congelada' &&
                      canFreezeOrDiscontinueVaga && (
                        <Button
                          onClick={handleUnfreeze}
                          disabled={isLoading}
                          variant="default"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Descongelar vaga
                        </Button>
                      )}

                    {vaga.status === 'vaga_descontinuada' &&
                      canFreezeOrDiscontinueVaga && (
                        <Button
                          onClick={handleReactivate}
                          disabled={isLoading}
                          variant="default"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reativar vaga
                        </Button>
                      )}

                    {/* Edit button is always visible */}
                    <Button
                      onClick={() => setIsEditing(true)}
                      disabled={isLoading || activeTab === 'candidates'}
                      variant="outline"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>

                    {/* Secondary actions in dropdown, similar to serviços municipais */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isLoading}
                        >
                          <EllipsisVertical className="h-4 w-4" />
                          <span className="sr-only">Mais opções</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Vaga rascunho (em_edicao):
                            - visíveis: Enviar para aprovação, Editar
                            - dropdown: Publicar vaga, Excluir */}
                        {vaga.status === 'em_edicao' && (
                          <>
                            {canPublishVagaAsAtivo && (
                              <DropdownMenuItem
                                onClick={handlePublish}
                                disabled={isLoading}
                                className="cursor-pointer"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Publicar vaga
                              </DropdownMenuItem>
                            )}
                            {canDeleteVagaWithStatus(
                              user?.roles,
                              vaga.status ?? ''
                            ) && (
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isLoading}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* Vaga aguardando aprovação (em_aprovacao):
                            - visíveis: Publicar vaga, Editar
                            - dropdown: Enviar para edição, Excluir */}
                        {vaga.status === 'em_aprovacao' && (
                          <>
                            <DropdownMenuItem
                              onClick={handleSendToDraft}
                              disabled={isLoading}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Enviar para edição
                            </DropdownMenuItem>
                            {canDeleteVagaWithStatus(
                              user?.roles,
                              vaga.status ?? ''
                            ) && (
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isLoading}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* Vaga ativa (publicado_ativo):
                            - visível: Editar
                            - dropdown: Pausar vaga, Encerrar vaga, Excluir */}
                        {vaga.status === 'publicado_ativo' && (
                          <>
                            {canFreezeOrDiscontinueVaga && (
                              <>
                                <DropdownMenuItem
                                  onClick={handleFreeze}
                                  disabled={isLoading}
                                  className="cursor-pointer"
                                >
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pausar vaga
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={handleDiscontinue}
                                  disabled={isLoading}
                                  className="cursor-pointer"
                                >
                                  <Square className="mr-2 h-4 w-4" />
                                  Encerrar vaga
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDeleteVagaWithStatus(
                              user?.roles,
                              vaga.status ?? ''
                            ) && (
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isLoading}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* Vaga expirada (publicado_expirado):
                            - visível: Editar
                            - dropdown: Encerrar vaga, Excluir */}
                        {vaga.status === 'publicado_expirado' && (
                          <>
                            {canFreezeOrDiscontinueVaga && (
                              <DropdownMenuItem
                                onClick={handleDiscontinue}
                                disabled={isLoading}
                                className="cursor-pointer"
                              >
                                <Square className="mr-2 h-4 w-4" />
                                Encerrar vaga
                              </DropdownMenuItem>
                            )}
                            {canDeleteVagaWithStatus(
                              user?.roles,
                              vaga.status ?? ''
                            ) && (
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isLoading}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* Vaga pausada (vaga_congelada):
                            - visíveis: Editar, Descongelar vaga
                            - dropdown: Encerrar vaga, Excluir */}
                        {vaga.status === 'vaga_congelada' && (
                          <>
                            {canFreezeOrDiscontinueVaga && (
                              <DropdownMenuItem
                                onClick={handleDiscontinue}
                                disabled={isLoading}
                                className="cursor-pointer"
                              >
                                <Square className="mr-2 h-4 w-4" />
                                Encerrar vaga
                              </DropdownMenuItem>
                            )}
                            {canDeleteVagaWithStatus(
                              user?.roles,
                              vaga.status ?? ''
                            ) && (
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={isLoading}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                        {/* Vaga encerrada (vaga_descontinuada):
                            - visíveis: Editar, Reativar vaga
                            - dropdown: Excluir */}
                        {vaga.status === 'vaga_descontinuada' &&
                          canDeleteVagaWithStatus(user?.roles, vaga.status) && (
                            <DropdownMenuItem
                              onClick={handleDelete}
                              disabled={isLoading}
                              variant="destructive"
                              className="cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}

                {isEditing && (
                  <>
                    {vaga.status === 'em_edicao' ? (
                      <>
                        {/* Draft: Show "Salvar Rascunho" and "Salvar e Publicar" (editor_com_curadoria cannot publish) */}
                        <Button
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isLoading}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
                        </Button>
                        {canPublishVagaAsAtivo && (
                          <Button
                            onClick={handleSaveAndPublish}
                            disabled={isLoading}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {isLoading ? 'Publicando...' : 'Salvar e Publicar'}
                          </Button>
                        )}
                      </>
                    ) : (
                      /* Published: Show only "Salvar" */
                      <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="about"
              disabled={isEditing && hasUnsavedChanges}
            >
              Sobre a vaga
            </TabsTrigger>
            <TabsTrigger value="candidates" disabled={isEditing}>
              <Users className="w-4 h-4 mr-2" />
              Candidatos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            {/* Empregabilidade Form */}
            <div
              className={
                !isEditing || isReadOnlyForEditor
                  ? 'pointer-events-none opacity-90'
                  : ''
              }
            >
              <NewEmpregabilidadeForm
                ref={formRef}
                initialData={formData}
                isReadOnly={!isEditing || isReadOnlyForEditor}
                vagaStatus={
                  vaga.status as
                    | 'em_edicao'
                    | 'publicado_ativo'
                    | 'publicado_expirado'
                    | 'vaga_congelada'
                    | 'vaga_descontinuada'
                    | null
                }
                onFormChangesDetected={handleFormChanges}
                onSubmit={handleFormSubmit}
                onSaveDraft={handleFormSaveDraft}
                onSaveAndPublish={handleFormSaveAndPublish}
              />
            </div>
          </TabsContent>

          <TabsContent value="candidates" className="mt-6">
            <CandidatesTable
              key={candidatesRefreshKey}
              empregabilidadeId={vagaId}
              empregabilidadeTitle={vaga.titulo}
              vagaStatus={
                vaga.status as
                  | 'em_edicao'
                  | 'em_aprovacao'
                  | 'publicado_ativo'
                  | 'publicado_expirado'
                  | 'vaga_congelada'
                  | 'vaga_descontinuada'
              }
              informacoesComplementares={fromApiInformacaoComplementar(
                vaga.informacoes_complementares
              )}
              headerTitle="Candidaturas na vaga"
              onAddCandidateClick={
                canEditVagas ? () => setShowNewCandidateDialog(true) : undefined
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'delete'}
        onOpenChange={open =>
          setConfirmDialog({ open, type: open ? 'delete' : null })
        }
        title="Excluir Vaga"
        description="Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'publish'}
        onOpenChange={open =>
          setConfirmDialog({ open, type: open ? 'publish' : null })
        }
        title="Publicar Vaga"
        description="Tem certeza que deseja publicar esta vaga? Ela ficará visível para todos os usuários."
        confirmText="Publicar"
        cancelText="Cancelar"
        onConfirm={confirmPublish}
        variant="default"
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'freeze'}
        onOpenChange={open =>
          setConfirmDialog({ open, type: open ? 'freeze' : null })
        }
        title="Pausar vaga"
        description="A vaga deixará de aceitar novas candidaturas e o status das candidaturas será atualizado para vaga congelada. Você pode descongelar depois."
        confirmText="Pausar"
        cancelText="Cancelar"
        onConfirm={confirmFreeze}
        variant="default"
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'discontinue'}
        onOpenChange={open =>
          setConfirmDialog({ open, type: open ? 'discontinue' : null })
        }
        title="Encerrar vaga"
        description="A vaga será descontinuada e o status das candidaturas será atualizado para vaga descontinuada. Você pode reativar depois."
        confirmText="Encerrar"
        cancelText="Cancelar"
        onConfirm={confirmDiscontinue}
        variant="destructive"
      />

      <ConfirmDialog
        open={showReactivateExpiredDialog}
        onOpenChange={setShowReactivateExpiredDialog}
        title="Vaga voltará a ficar ativa"
        description="Ao salvar com uma data limite futura, esta vaga deixará de estar expirada e voltará a aparecer como ativa para o cidadão. Deseja continuar?"
        confirmText="Sim, continuar"
        cancelText="Cancelar"
        onConfirm={handleConfirmReactivateExpired}
        variant="default"
      />

      <ConfirmDialog
        open={showTabChangeDialog}
        onOpenChange={setShowTabChangeDialog}
        title="Alterações não salvas"
        description="Você tem alterações não salvas. Se você sair agora, as alterações serão perdidas."
        confirmText="Sair sem salvar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmTabChange}
        variant="destructive"
      />

      {/* New Candidate Dialog */}
      {vagaId && vaga.titulo && (
        <NewCandidateDialog
          open={showNewCandidateDialog}
          onOpenChange={setShowNewCandidateDialog}
          vagaId={vagaId}
          vagaTitle={vaga.titulo}
          informacoesComplementares={fromApiInformacaoComplementar(
            vaga.informacoes_complementares
          )}
          onSuccess={() => {
            setShowNewCandidateDialog(false)
            setCandidatesRefreshKey(prev => prev + 1)
          }}
        />
      )}
    </ContentLayout>
  )
}
