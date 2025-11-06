'use client'

import { MarkdownViewer } from '@/components/blocks/editor-md/markdown-viewer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useIsBuscaServicesAdmin } from '@/hooks/use-heimdall-user'
import { useServiceVersions } from '@/hooks/use-service-versions'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsFieldChange } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsFieldChange'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsServiceVersion } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsServiceVersion'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface ServiceVersionHistoryProps {
  serviceId: string
  onRollbackSuccess?: () => void
}

// Mapeamento de nomes de campos para labels em português
const fieldLabels: Record<string, string> = {
  nome_servico: 'Título do serviço',
  tema_geral: 'Categoria do serviço',
  resumo: 'Descrição resumida do serviço',
  descricao_completa: 'Descrição completa do serviço',
  custo_servico: 'Custo do serviço',
  tempo_atendimento: 'Tempo para atendimento',
  servico_nao_cobre: 'O que o serviço não cobre',
  is_free: 'Serviço gratuito',
  orgao_gestor: 'Órgão gestor',
  publico_especifico: 'Público específico',
  canais_digitais: 'Canais digitais',
  canais_presenciais: 'Canais presenciais',
  legislacao_relacionada: 'Legislação relacionada',
  documentos_necessarios: 'Documentos necessários',
  instrucoes_solicitante: 'Instruções para o solicitante',
  resultado_solicitacao: 'Resultado da solicitação',
  search_content: 'Conteúdo de busca',
  status: 'Status',
  awaiting_approval: 'Aguardando aprovação',
}

// Campos que contêm markdown e devem ser renderizados com MarkdownViewer
const markdownFields = new Set([
  'resumo',
  'descricao_completa',
  'documentos_necessarios',
  'instrucoes_solicitante',
  'resultado_solicitacao',
  'search_content',
])

function formatStatusValue(value: unknown): string {
  // Converte status numérico para texto legível
  if (value === null || value === undefined) {
    return '—'
  }

  const numValue = typeof value === 'number' ? value : Number(value)

  if (numValue === 1) {
    return 'Publicado'
  }
  if (numValue === 0) {
    return 'Em edição'
  }

  return String(value)
}

function formatFieldValue(value: unknown, fieldName?: string): string {
  if (value === null || value === undefined) {
    return '—'
  }

  // Formatação especial para o campo status
  if (fieldName === 'status') {
    return formatStatusValue(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'Nenhum'
    // Se for array de strings, pode ser documentos_necessarios que pode ter markdown
    // Retornar o primeiro item se for array com um único item (caso de documentos_necessarios)
    if (value.length === 1 && typeof value[0] === 'string') {
      return value[0]
    }
    return value.join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function isMarkdownField(fieldName: string | undefined): boolean {
  if (!fieldName) return false
  return markdownFields.has(fieldName)
}

function getFieldValueAsString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    // Se for array de strings, retornar o primeiro item se for array com um único item
    if (value.length === 1 && typeof value[0] === 'string') {
      return value[0]
    }
    return value.join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '—'
  try {
    // Timestamp vem em segundos, precisa converter para milissegundos
    const date = new Date(timestamp * 1000)
    return format(date, 'dd/MM/yyyy - HH:mm:ss', { locale: ptBR })
  } catch {
    return '—'
  }
}

interface VersionDiffDisplayProps {
  version: GithubComPrefeituraRioAppBuscaSearchInternalModelsServiceVersion
  previousVersion?: number
  getVersionDiff: (
    fromVersion: number,
    toVersion: number
  ) => Promise<GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff | null>
}

function VersionDiffDisplay({
  version,
  previousVersion,
  getVersionDiff,
}: VersionDiffDisplayProps) {
  const [diff, setDiff] =
    useState<GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff | null>(
      null
    )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (previousVersion && version.version_number) {
      setLoading(true)
      getVersionDiff(previousVersion, version.version_number)
        .then(result => {
          setDiff(result)
        })
        .catch(err => {
          console.error('Error loading diff:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [previousVersion, version.version_number, getVersionDiff])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner />
      </div>
    )
  }

  if (!diff || !diff.changes || diff.changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Nenhuma alteração registrada nesta versão.
      </div>
    )
  }

  // Filtrar alterações para excluir search_content
  const filteredChanges = diff.changes.filter(
    change => change.field_name !== 'search_content'
  )

  if (filteredChanges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Nenhuma alteração registrada nesta versão.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredChanges.map(
        (
          change: GithubComPrefeituraRioAppBuscaSearchInternalModelsFieldChange,
          index: number
        ) => {
          const fieldLabel =
            fieldLabels[change.field_name || ''] ||
            change.field_name ||
            'Campo desconhecido'
          const isMarkdown = isMarkdownField(change.field_name)
          const oldValue = formatFieldValue(change.old_value, change.field_name)
          const newValue = formatFieldValue(change.new_value, change.field_name)
          const oldValueString = getFieldValueAsString(change.old_value)
          const newValueString = getFieldValueAsString(change.new_value)

          return (
            <Card key={index} className="p-4 bg-muted/50">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{fieldLabel}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      De:
                    </p>
                    {isMarkdown ? (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded p-2">
                        {oldValueString && oldValueString.trim() !== '' ? (
                          <MarkdownViewer
                            content={oldValueString}
                            className="bg-transparent border-0 p-0"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded p-2 break-words">
                        {oldValue}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Para:
                    </p>
                    {isMarkdown ? (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded p-2">
                        {newValueString && newValueString.trim() !== '' ? (
                          <MarkdownViewer
                            content={newValueString}
                            className="bg-transparent border-0 p-0"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded p-2 break-words">
                        {newValue}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        }
      )}
    </div>
  )
}

export function ServiceVersionHistory({
  serviceId,
  onRollbackSuccess,
}: ServiceVersionHistoryProps) {
  const { versions, loading, error, getVersionDiff, rollbackToVersion } =
    useServiceVersions(serviceId)
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const [rollbackDialog, setRollbackDialog] = useState<{
    open: boolean
    versionNumber: number | null
    changeReason: string
  }>({
    open: false,
    versionNumber: null,
    changeReason: '',
  })
  const [isRollingBack, setIsRollingBack] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p>Erro ao carregar histórico de versões: {error}</p>
        </div>
      </Card>
    )
  }

  if (!versions || !versions.versions || versions.versions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Nenhuma versão encontrada para este serviço.</p>
        </div>
      </Card>
    )
  }

  // Ordenar versões: mais recentes primeiro (maior version_number primeiro)
  // Se houver múltiplas versões com o mesmo version_number, manter apenas a mais recente
  const versionMap = new Map<number, (typeof versions.versions)[0]>()

  for (const version of versions.versions) {
    const versionNumber = version.version_number || 0
    const existing = versionMap.get(versionNumber)

    if (!existing) {
      versionMap.set(versionNumber, version)
    } else {
      // Se já existe, manter a mais recente (com maior created_at ou id)
      const currentTimestamp = version.created_at || version.published_at || 0
      const existingTimestamp =
        existing.created_at || existing.published_at || 0

      if (currentTimestamp > existingTimestamp) {
        versionMap.set(versionNumber, version)
      } else if (currentTimestamp === existingTimestamp) {
        // Se os timestamps são iguais, usar o id maior (mais recente)
        const currentId = version.id ? Number.parseInt(version.id, 10) : 0
        const existingId = existing.id ? Number.parseInt(existing.id, 10) : 0
        if (currentId > existingId) {
          versionMap.set(versionNumber, version)
        }
      }
    }
  }

  // Converter map para array e ordenar
  const sortedVersions = Array.from(versionMap.values()).sort(
    (a, b) => (b.version_number || 0) - (a.version_number || 0)
  )

  // Obter a versão atual (a mais recente)
  const currentVersionNumber = sortedVersions[0]?.version_number || 0

  const handleRollbackClick = (versionNumber: number) => {
    setRollbackDialog({
      open: true,
      versionNumber,
      changeReason: '',
    })
  }

  const handleConfirmRollback = async () => {
    if (rollbackDialog.versionNumber === null) return

    try {
      setIsRollingBack(true)
      const result = await rollbackToVersion(
        rollbackDialog.versionNumber,
        rollbackDialog.changeReason || undefined
      )

      if (result.success) {
        toast.success(
          `Serviço revertido para a versão ${rollbackDialog.versionNumber} com sucesso!`
        )
        setRollbackDialog({
          open: false,
          versionNumber: null,
          changeReason: '',
        })
        // Notify parent component to refetch service data
        if (onRollbackSuccess) {
          onRollbackSuccess()
        }
      } else {
        toast.error(result.error || 'Erro ao fazer rollback da versão')
      }
    } catch (error) {
      console.error('Error in rollback:', error)
      toast.error('Erro ao fazer rollback da versão')
    } finally {
      setIsRollingBack(false)
    }
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        {sortedVersions.map((version, index) => {
          const versionNumber = version.version_number || 0
          const versionId = version.id || `version-${versionNumber}-${index}`
          const previousVersion = sortedVersions[index + 1]?.version_number
          const timestamp = version.created_at || version.published_at
          const isCurrentVersion = versionNumber === currentVersionNumber

          return (
            <AccordionItem key={versionId} value={`version-${versionId}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      Versão {versionNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(timestamp)}
                    </span>
                    {isCurrentVersion && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                        Versão atual
                      </span>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {version.created_by && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Alterado por:</span>{' '}
                      {version.created_by}
                    </div>
                  )}
                  {version.change_reason && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Motivo da alteração:</span>{' '}
                      {version.change_reason}
                    </div>
                  )}
                  <VersionDiffDisplay
                    version={version}
                    previousVersion={previousVersion}
                    getVersionDiff={getVersionDiff}
                  />
                  {isBuscaServicesAdmin && !isCurrentVersion && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          handleRollbackClick(versionNumber)
                        }}
                        disabled={isRollingBack}
                        className="sm:w-auto"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reverter para esta versão
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        open={rollbackDialog.open}
        onOpenChange={open => setRollbackDialog(prev => ({ ...prev, open }))}
        title="Reverter para versão anterior"
        description={`Tem certeza que deseja reverter o serviço para a versão ${rollbackDialog.versionNumber}? Esta ação criará uma nova versão que restaura o estado da versão selecionada.`}
        confirmText={isRollingBack ? 'Revertendo...' : 'Reverter'}
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmRollback}
      >
        <div className="space-y-2">
          <label
            htmlFor="rollback-reason"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Motivo da reversão (opcional)
          </label>
          <Input
            id="rollback-reason"
            placeholder="Descreva o motivo da reversão..."
            value={rollbackDialog.changeReason}
            onChange={e =>
              setRollbackDialog(prev => ({
                ...prev,
                changeReason: e.target.value,
              }))
            }
            disabled={isRollingBack}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
