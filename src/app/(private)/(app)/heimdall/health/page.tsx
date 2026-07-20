'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Copy,
  Download,
  Info,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { StatusBadge } from '../components/status-badge'
import { useHeimdallHealthz } from '../hooks/use-heimdall-dashboard'
import {
  type CerbosPolicyTemplate,
  getDependencyEntries,
  useHeimdallCerbosPolicyTemplate,
  useHeimdallReadyz,
  useRefreshHeimdallHealth,
} from '../hooks/use-heimdall-health'
import { BADGE_TONE_CLASSES } from '../lib/tones'

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function HealthCheckCard({
  title,
  loading,
  status,
  service,
  timestamp,
  errors,
  failedMessage,
}: {
  title: string
  loading: boolean
  status?: string
  service?: string
  timestamp?: string
  errors?: string[]
  failedMessage: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span>{title}</span>
          {status && <StatusBadge status={status} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !status ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : status ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-medium text-muted-foreground">Serviço</span>
              <span className="text-right">{service || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-medium text-muted-foreground">
                Timestamp
              </span>
              <span className="text-right">{formatTimestamp(timestamp)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-medium text-muted-foreground">Status</span>
              <StatusBadge status={status} />
            </div>
            {errors && errors.length > 0 && (
              <div className="mt-2">
                <span className="font-medium text-destructive">Erros:</span>
                <ul className="mt-1 space-y-1 text-destructive">
                  {errors.map(error => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-destructive">{failedMessage}</p>
        )}
      </CardContent>
    </Card>
  )
}

function CerbosPolicySection({
  loading,
  template,
}: {
  loading: boolean
  template: CerbosPolicyTemplate | undefined
}) {
  const downloadPolicyTemplate = () => {
    if (!template) return

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cerbos-superadmin-policy.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Template de política baixado')
  }

  const copyPolicyTemplate = async () => {
    if (!template) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(template, null, 2))
      toast.success('Template de política copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar o template')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template de política Cerbos</CardTitle>
        <CardDescription>
          Template da política de superadmin para configuração manual do Cerbos
          quando a API admin estiver desabilitada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !template ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : template ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-medium text-muted-foreground">
                  Versão da API
                </span>
                <span>{template.apiVersion || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium text-muted-foreground">Kind</span>
                <span>{template.kind || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium text-muted-foreground">Papel</span>
                <span>{template.rolePolicy?.role || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium text-muted-foreground">
                  Regras
                </span>
                <span>{template.rolePolicy?.rules?.length ?? 0} regra(s)</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={downloadPolicyTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar JSON
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={copyPolicyTemplate}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar para a área de transferência
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Uso:</p>
              <ol className="mt-1 list-inside list-decimal space-y-1">
                <li>Baixe ou copie o template de política</li>
                <li>
                  Salve como arquivo YAML ou JSON na configuração do Cerbos
                </li>
                <li>
                  Aplique via o método de deploy do Cerbos (ConfigMap, sistema
                  de arquivos, etc.)
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive">
            Não foi possível obter o template de política Cerbos
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function HeimdallHealthPage() {
  const {
    data: healthStatus,
    isLoading: healthLoading,
    isFetching: healthFetching,
    isError: healthError,
  } = useHeimdallHealthz()
  const {
    data: readinessStatus,
    isLoading: readinessLoading,
    isFetching: readinessFetching,
    isError: readinessError,
  } = useHeimdallReadyz()
  const {
    data: cerbosPolicyTemplate,
    isLoading: templateLoading,
    isFetching: templateFetching,
    isError: templateError,
  } = useHeimdallCerbosPolicyTemplate()

  const refresh = useRefreshHeimdallHealth()
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null)

  React.useEffect(() => {
    if (!healthLoading && !readinessLoading && !templateLoading) {
      setLastCheck(new Date())
    }
  }, [healthLoading, readinessLoading, templateLoading])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refresh()
      setLastCheck(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  const loading =
    isRefreshing ||
    healthFetching ||
    readinessFetching ||
    templateFetching ||
    healthLoading ||
    readinessLoading ||
    templateLoading

  const dependencies = getDependencyEntries(readinessStatus)

  return (
    <ContentLayout title="Health">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Monitoramento de saúde"
          description="Monitore a saúde do sistema e das dependências do Heimdall."
          breadcrumbs={[{ label: 'Health' }]}
          actions={
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
              />
              Atualizar
            </Button>
          }
        />

        {lastCheck && (
          <p className="text-sm text-muted-foreground">
            Última verificação: {lastCheck.toLocaleString('pt-BR')}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <HealthCheckCard
            title="Verificação básica"
            loading={healthLoading}
            status={
              healthError
                ? 'unhealthy'
                : (healthStatus?.status as string | undefined)
            }
            service={
              healthError
                ? 'heimdall-admin-service'
                : (healthStatus?.service as string | undefined)
            }
            timestamp={
              healthError
                ? new Date().toISOString()
                : (healthStatus?.timestamp as string | undefined)
            }
            failedMessage="Não foi possível obter o status de saúde"
          />
          <HealthCheckCard
            title="Verificação de prontidão"
            loading={readinessLoading}
            status={
              readinessError
                ? 'not_ready'
                : (readinessStatus?.status as string | undefined)
            }
            service={
              readinessError
                ? 'heimdall-admin-service'
                : (readinessStatus?.service as string | undefined)
            }
            timestamp={
              readinessError
                ? new Date().toISOString()
                : (readinessStatus?.timestamp as string | undefined)
            }
            errors={
              readinessError
                ? ['Serviço não está pronto']
                : readinessStatus?.errors
            }
            failedMessage="Não foi possível obter o status de prontidão"
          />
        </div>

        {dependencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Status das dependências</CardTitle>
              <CardDescription>
                Estado individual de cada dependência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {dependencies.map(dep => (
                  <div
                    key={dep.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      {dep.healthy ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium capitalize">{dep.name}</span>
                    </div>
                    <Badge
                      variant={dep.healthy ? 'outline' : 'destructive'}
                      className={
                        dep.healthy ? BADGE_TONE_CLASSES.green : undefined
                      }
                    >
                      {dep.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <CerbosPolicySection
          loading={templateLoading}
          template={templateError ? undefined : cerbosPolicyTemplate}
        />

        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <h4 className="mb-2 font-medium">
                Informações sobre o monitoramento
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    Verificação básica:
                  </strong>{' '}
                  Confirma se o serviço está em execução e respondendo
                </li>
                <li>
                  <strong className="text-foreground">Prontidão:</strong>{' '}
                  Verifica se todas as dependências (banco, Redis, Cerbos) estão
                  saudáveis
                </li>
                <li>
                  <strong className="text-foreground">Dependências:</strong>{' '}
                  Mostra o status individual de cada dependência do sistema
                </li>
                <li>
                  <strong className="text-foreground">
                    Template de política:
                  </strong>{' '}
                  Fornece a configuração Cerbos para setup manual
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}
