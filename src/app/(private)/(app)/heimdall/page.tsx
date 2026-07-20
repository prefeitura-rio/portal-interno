'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
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
  Activity,
  RefreshCw,
  Shield,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { HeimdallPageHeader } from './components/heimdall-page-header'
import { StatusBadge } from './components/status-badge'
import { SummaryCards } from './components/summary-cards'
import {
  useHeimdallDashboardStats,
  useHeimdallHealthz,
  useRefreshHeimdallDashboard,
} from './hooks/use-heimdall-dashboard'

const AREA_LINKS = [
  {
    href: '/heimdall/usuarios',
    label: 'Usuários',
    description: 'Consulte perfis e busque por CPF',
  },
  {
    href: '/heimdall/grupos',
    label: 'Grupos',
    description: 'Crie e gerencie grupos de usuários',
  },
  {
    href: '/heimdall/papeis',
    label: 'Papéis',
    description: 'Defina permissões e atribua a grupos',
  },
  {
    href: '/heimdall/acoes',
    label: 'Ações',
    description: 'Gerencie as ações disponíveis no sistema',
  },
  {
    href: '/heimdall/mapeamentos',
    label: 'Mapeamentos',
    description: 'Configure mapeamentos de endpoint para ação',
  },
  {
    href: '/heimdall/health',
    label: 'Health',
    description: 'Monitore a saúde e o status do sistema',
  },
  {
    href: '/heimdall/documentacao',
    label: 'Documentação',
    description: 'Modelo RBAC, fluxo de authz e exemplo concreto',
  },
] as const

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('pt-BR')
}

export default function HeimdallDashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useHeimdallDashboardStats()
  const {
    data: healthStatus,
    isLoading: healthLoading,
    isFetching: healthFetching,
    isError: healthError,
  } = useHeimdallHealthz()
  const refresh = useRefreshHeimdallDashboard()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const loading =
    statsLoading ||
    healthLoading ||
    isRefreshing ||
    statsFetching ||
    healthFetching

  return (
    <ContentLayout title="Dashboard">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Dashboard"
          description="Visão geral do Heimdall Admin: contagens e status do sistema."
          breadcrumbs={[{ label: 'Dashboard' }]}
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

        <SummaryCards
          loading={statsLoading}
          items={[
            {
              label: 'Usuários',
              value: stats?.users ?? 0,
              icon: Users,
              tone: 'blue',
            },
            {
              label: 'Grupos',
              value: stats?.groups ?? 0,
              icon: UsersRound,
              tone: 'yellow',
            },
            {
              label: 'Papéis',
              value: stats?.roles ?? 0,
              icon: Shield,
              tone: 'orange',
            },
            {
              label: 'Ações',
              value: stats?.actions ?? 0,
              icon: Zap,
              tone: 'green',
            },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Bem-vindo ao Heimdall Admin</CardTitle>
              <CardDescription>
                Gerencie usuários, grupos, papéis e permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Use o menu de navegação para acessar as áreas de gestão:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {AREA_LINKS.map(area => (
                  <li key={area.href}>
                    <Link
                      href={area.href}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {area.label}
                    </Link>
                    {': '}
                    {area.description}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Status do sistema
              </CardTitle>
              <CardDescription>
                Conexão com a API e status de saúde
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : healthStatus && !healthError ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <StatusBadge status={healthStatus.status} />
                  </div>
                  {healthStatus.service && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Serviço</span>
                      <span className="text-right">{healthStatus.service}</span>
                    </div>
                  )}
                  {healthStatus.timestamp && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="text-right">
                        {formatTimestamp(String(healthStatus.timestamp))}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status="desconhecido" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  )
}
