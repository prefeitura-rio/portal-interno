'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCourseTabCounts } from '@/hooks/use-course-tab-counts'
import { useCoursesDashboard } from '@/hooks/use-courses-dashboard'
import type { SecretariaTractionRow } from '@/lib/courses-dashboard'
import { COURSES_DASHBOARD_REFRESH_INTERVAL_MS } from '@/lib/courses-dashboard-refresh'
import type { CourseTab } from '@/lib/courses-tab-counts'
import {
  AlertTriangle,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileText,
  type LucideIcon,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

/**
 * Abas de `/gorio/courses` que viram cards. Os números vêm do mesmo hook e
 * dos mesmos BFFs das abas (DEV-59), por isso batem com elas.
 */
const PIPELINE_TABS = [
  'created',
  'in_review',
  'draft',
] as const satisfies readonly CourseTab[]

interface PipelineCardConfig {
  tab: (typeof PIPELINE_TABS)[number]
  title: string
  description: string
  icon: LucideIcon
  iconClassName: string
}

const PIPELINE_CARDS: readonly PipelineCardConfig[] = [
  {
    tab: 'created',
    title: 'Total de Cursos Criados',
    description: 'Cursos da aba "Cursos Criados"',
    icon: BookOpen,
    iconClassName:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  {
    tab: 'in_review',
    title: 'Pronto para Aprovação',
    description: 'Cursos aguardando a homologação da Casa Civil',
    icon: ClipboardCheck,
    iconClassName:
      'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  },
  {
    tab: 'draft',
    title: 'Rascunhos',
    description: 'Cursos ainda em rascunho',
    icon: FileText,
    iconClassName:
      'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400',
  },
]

const numberFormatter = new Intl.NumberFormat('pt-BR')

export default function CoursesDashboardPage() {
  const { counts, loading: countsLoading } = useCourseTabCounts({
    tabs: PIPELINE_TABS,
    // Os cards se atualizam sozinhos, no mesmo intervalo da tabela (DEV-106)
    refetchIntervalMs: COURSES_DASHBOARD_REFRESH_INTERVAL_MS,
  })

  return (
    <ContentLayout title="Dashboard de Capacitações">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/courses">Capacitação</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Dashboard de Capacitações
            </h2>
            <p className="text-muted-foreground">
              Pipeline municipal de cursos e tração por secretaria.
            </p>
          </div>
        </div>

        <section aria-label="Pipeline de cursos">
          <div className="grid gap-4 md:grid-cols-3">
            {PIPELINE_CARDS.map(card => (
              <PipelineCard
                key={card.tab}
                config={card}
                count={counts[card.tab]}
                loading={countsLoading}
              />
            ))}
          </div>
        </section>

        <SecretariaTractionCard />
      </div>
    </ContentLayout>
  )
}

function PipelineCard({
  config,
  count,
  loading,
}: {
  config: PipelineCardConfig
  count: number | undefined
  loading: boolean
}) {
  const Icon = config.icon
  const href = `/gorio/courses?tab=${config.tab}`

  return (
    <Link
      href={href}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full gap-4 transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${config.iconClassName}`}
          >
            <Icon className="size-5" />
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {count === undefined ? '—' : numberFormatter.format(count)}
            </p>
          )}
          {!loading && count === undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              Contagem indisponível no momento
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function SecretariaTractionCard() {
  const { data, isLoading, isError, isFetching, refetch } =
    useCoursesDashboard()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-muted-foreground" />
            Tração por secretaria
          </CardTitle>
          <CardDescription>
            Cursos publicados e total de inscritos de cada secretaria, em todo o
            município.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {data && data.totals.coursesWithoutEnrollmentCount > 0 && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Não foi possível contar as inscrições de{' '}
              {numberFormatter.format(
                data.totals.coursesWithoutEnrollmentCount
              )}{' '}
              curso(s); elas estão fora dos totais. Tente atualizar.
            </span>
          </div>
        )}

        {data && data.secretariasWithoutName > 0 && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Não foi possível identificar o nome de{' '}
              {numberFormatter.format(data.secretariasWithoutName)}{' '}
              secretaria(s) agora; os números estão corretos. Tente atualizar.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {['a', 'b', 'c', 'd'].map(key => (
              <Skeleton key={key} className="h-10 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive dark:bg-destructive/10"
          >
            <AlertTriangle className="size-5" />
            <p>Não foi possível carregar o consolidado por secretaria.</p>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : data.secretarias.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum curso publicado até o momento.
          </p>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Secretaria</TableHead>
                  <TableHead className="text-right">
                    Cursos publicados
                  </TableHead>
                  <TableHead className="text-right">
                    Total de inscritos
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.secretarias.map(row => (
                  <TableRow key={row.orgaoId ?? 'sem-secretaria'}>
                    <TableCell className="whitespace-normal">
                      <SecretariaLabel row={row} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormatter.format(row.publishedCourses)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormatter.format(row.totalEnrollments)}
                      {row.coursesWithoutEnrollmentCount > 0 && (
                        <span className="ml-1 text-amber-600 dark:text-amber-400">
                          *
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {numberFormatter.format(data.totals.publishedCourses)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {numberFormatter.format(data.totals.totalEnrollments)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Nome da secretaria resolvido no servidor pelo BFF do consolidado. */
function SecretariaLabel({ row }: { row: SecretariaTractionRow }) {
  const { orgaoId, secretaria } = row

  if (orgaoId === null || secretaria === null) {
    return (
      <span className="text-muted-foreground">Sem secretaria informada</span>
    )
  }

  if (secretaria.status === 'found') {
    return (
      <span>
        {secretaria.nome}
        {secretaria.sigla && secretaria.sigla !== secretaria.nome && (
          <span className="ml-1 text-muted-foreground">
            ({secretaria.sigla})
          </span>
        )}
      </span>
    )
  }

  if (secretaria.status === 'not_found') {
    return (
      <span className="text-muted-foreground">
        Órgão não encontrado (código {orgaoId})
      </span>
    )
  }

  return (
    <span className="text-muted-foreground">
      Órgão {orgaoId}{' '}
      <span className="text-amber-600 dark:text-amber-400">
        (nome indisponível)
      </span>
    </span>
  )
}
