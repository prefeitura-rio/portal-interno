'use client'

import { CandidatesTable } from '@/app/(private)/(app)/gorio/components/candidates-table'
import {
  NewEmpregabilidadeForm,
  type NewEmpregabilidadeFormRef,
} from '@/app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import { UnsavedChangesGuard } from '@/components/unsaved-changes-guard'
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
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { useVaga } from '@/hooks/use-vaga'
import {
  vagaStatusConfig,
  type VagaStatus,
} from '@/lib/status-config/empregabilidade'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, Edit, Play, Save, Trash2, Users, X } from 'lucide-react'
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
  const { canEditGoRio } = useHeimdallUserContext()

  // All state hooks (must be in consistent order)
  const [vagaId, setVagaId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('about')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'delete' | 'publish' | null
  }>({
    open: false,
    type: null,
  })

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

  // Handle save - trigger form submission
  const handleSave = useCallback(() => {
    if (formRef.current) {
      formRef.current.triggerSubmit()
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

  const confirmPublish = useCallback(async () => {
    if (!vaga?.id) return

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

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (data: any) => {
      if (!vaga?.id) return

      setIsLoading(true)

      try {
        // Map form field names to API field names
        const {
          contratante,
          regime_contratacao,
          modelo_trabalho,
          tipo_pcd,
          ...rest
        } = data

        const apiData = {
          ...rest,
          id_contratante: contratante || vaga.id_contratante,
          id_regime_contratacao:
            regime_contratacao || vaga.id_regime_contratacao,
          id_modelo_trabalho: modelo_trabalho || vaga.id_modelo_trabalho,
          tipos_pcd: tipo_pcd || vaga.tipos_pcd,
        }

        console.log('Saving vaga with data:', apiData)

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
    [vaga, refetch]
  )

  // Auto-enable edit mode if edit=true query parameter is present
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam === 'true' && canEditGoRio) {
      setIsEditing(true)
    }

    // Set active tab from URL parameter
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'about' || tabParam === 'candidates')) {
      setActiveTab(tabParam)
    } else if (!tabParam) {
      // Set default tab if no tab param exists
      updateTabInUrl('about')
    }
  }, [searchParams, updateTabInUrl, canEditGoRio])

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

  // Get status config
  const statusData = vaga.status
    ? vagaStatusConfig[vaga.status as VagaStatus]
    : null
  const StatusIcon = statusData?.icon

  // Map vaga data to form format
  const formData = {
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    contratante: vaga.id_contratante,
    regime_contratacao: vaga.id_regime_contratacao,
    modelo_trabalho: vaga.id_modelo_trabalho,
    vaga_pcd: vaga.vaga_pcd,
    tipo_pcd: vaga.tipos_pcd?.map(t => t.id || '') || [],
    valor_vaga: vaga.valor_vaga,
    bairro: vaga.bairro,
    data_limite: vaga.data_limite ? new Date(vaga.data_limite) : undefined,
    requisitos: vaga.requisitos,
    diferenciais: vaga.diferenciais,
    responsabilidades: vaga.responsabilidades,
    beneficios: vaga.beneficios,
    etapas: (vaga.etapas as any) || [],
    informacoes_complementares: (vaga.informacoes_complementares as any) || [],
    id_orgao_parceiro: vaga.id_orgao_parceiro,
  }

  return (
    <ContentLayout title="Detalhes da Vaga">
      <UnsavedChangesGuard hasUnsavedChanges={hasUnsavedChanges && isEditing} />

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
            {canEditGoRio && (
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    {vaga.status === 'em_edicao' && (
                      <Button
                        onClick={handlePublish}
                        disabled={isLoading}
                        variant="default"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Publicar
                      </Button>
                    )}
                    <Button
                      onClick={() => setIsEditing(true)}
                      disabled={isLoading}
                      variant="outline"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </>
                )}

                {isEditing && (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={isLoading || !hasUnsavedChanges}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isLoading ? 'Salvando...' : 'Salvar'}
                    </Button>
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="about">Sobre a vaga</TabsTrigger>
            <TabsTrigger value="candidates">
              <Users className="w-4 h-4 mr-2" />
              Candidatos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            {/* Empregabilidade Form */}
            <div className={!isEditing ? 'pointer-events-none opacity-90' : ''}>
              <NewEmpregabilidadeForm
                ref={formRef}
                initialData={formData}
                isReadOnly={!isEditing}
                onFormChangesDetected={handleFormChanges}
                onSubmit={handleFormSubmit}
              />
            </div>
          </TabsContent>

          <TabsContent value="candidates" className="mt-6">
            <CandidatesTable
              empregabilidadeId={vagaId}
              empregabilidadeTitle={vaga.titulo}
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
        open={showTabChangeDialog}
        onOpenChange={setShowTabChangeDialog}
        title="Alterações não salvas"
        description="Você tem alterações não salvas. Se você sair agora, as alterações serão perdidas."
        confirmText="Sair sem salvar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmTabChange}
        variant="destructive"
      />
    </ContentLayout>
  )
}
