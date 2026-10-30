'use client'

import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SCHEDULE_OUTCOME_STATUSES,
  type ScheduleOutcomeCounts,
  type ScheduleVacancyStatus,
  type ScheduleVacancySummary,
  countScheduleOutcomes,
  formatScheduleOccupancyPercent,
  getScheduleOccupancyPercent,
  getScheduleOutcomeCounts,
  getScheduleVacancyStatus,
  getScheduleVacancySummaries,
} from '@/lib/course-schedule-vacancies'
import {
  type EnrollmentsPage,
  fetchAllEnrollmentPages,
} from '@/lib/enrollment-class-filters'
import { cn } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'

interface ScheduleVacanciesSummaryProps {
  /** ID do curso */
  courseId: string
  /**
   * Muda quando as inscrições do curso mudam (ex.: contagens do resumo),
   * para recarregar a ocupação das turmas.
   */
  refreshKey?: string
}

export function ScheduleVacanciesSummary({
  courseId,
  refreshKey = '',
}: ScheduleVacanciesSummaryProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['course-schedule-vacancies', courseId, refreshKey],
    queryFn: () => fetchScheduleVacancies(courseId),
    enabled: !!courseId,
    placeholderData: keepPreviousData,
  })
  const outcomes = useQuery({
    queryKey: ['course-schedule-outcomes', courseId, refreshKey],
    queryFn: () => fetchScheduleOutcomes(courseId),
    enabled: !!courseId,
    placeholderData: keepPreviousData,
  })

  if (!courseId) return null

  if (isPending) {
    return (
      <section className="space-y-3 rounded-lg border p-4">
        <ScheduleVacanciesHeader />
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-3 rounded-lg border p-4">
        <ScheduleVacanciesHeader />
        <p className="text-sm text-destructive">
          Não foi possível carregar as vagas por turma.
        </p>
      </section>
    )
  }

  if (!data || data.length === 0) return null

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <ScheduleVacanciesHeader />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-l-4 border-l-transparent">
              Local
            </TableHead>
            <TableHead>Turma</TableHead>
            <TableHead className="text-right">Vagas</TableHead>
            <TableHead className="text-right">Inscritos</TableHead>
            <TableHead className="text-right">% Inscritos</TableHead>
            <TableHead className="text-right">Disponíveis</TableHead>
            <TableHead className="text-right">Recusados</TableHead>
            <TableHead className="text-right">Concluídos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(schedule => {
            const status = getScheduleVacancyStatus(schedule)
            const statusStyle = status ? STATUS_STYLES[status] : null
            const outcome = outcomes.data
              ? getScheduleOutcomeCounts(outcomes.data, schedule.id)
              : null
            return (
              <TableRow key={schedule.id}>
                <TableCell
                  className={cn(
                    'whitespace-normal border-l-4',
                    statusStyle?.border ?? 'border-l-transparent'
                  )}
                >
                  {schedule.local}
                  {statusStyle && (
                    <span className="sr-only">{` (${statusStyle.label})`}</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="font-medium">{schedule.turma}</div>
                  {formatScheduleDetails(schedule) && (
                    <div className="text-xs text-muted-foreground">
                      {formatScheduleDetails(schedule)}
                    </div>
                  )}
                </TableCell>
                <TableCell className={NUMERIC_CELL}>{schedule.vagas}</TableCell>
                <TableCell className={NUMERIC_CELL}>
                  {schedule.ocupadas ?? '—'}
                </TableCell>
                <TableCell
                  className={cn(NUMERIC_CELL, statusStyle?.percentText)}
                >
                  {formatScheduleOccupancyPercent(
                    getScheduleOccupancyPercent(schedule)
                  )}
                </TableCell>
                <TableCell className={NUMERIC_CELL}>
                  {schedule.disponiveis ?? '—'}
                </TableCell>
                <TableCell className={NUMERIC_CELL}>
                  {outcome?.recusados ?? '—'}
                </TableCell>
                <TableCell className={NUMERIC_CELL}>
                  {outcome?.concluidos ?? '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {outcomes.isError && (
        <p className="text-xs text-destructive">
          Não foi possível carregar os recusados e concluídos por turma.
        </p>
      )}
      <ScheduleVacanciesLegend />
    </section>
  )
}

function ScheduleVacanciesHeader() {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Users className="h-4 w-4" />
        Vagas por turma
      </h3>
      <p className="text-sm text-muted-foreground">
        % Inscritos = percentual de vagas preenchidas em relação ao total de
        vagas da turma (Inscritos ÷ Vagas).
      </p>
    </div>
  )
}

function ScheduleVacanciesLegend() {
  return (
    <ul className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {STATUS_ORDER.map(status => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('size-2 rounded-full', STATUS_STYLES[status].dot)}
          />
          {STATUS_STYLES[status].legend}
        </li>
      ))}
    </ul>
  )
}

function formatScheduleDetails(schedule: ScheduleVacancySummary): string {
  return [schedule.dias, schedule.horario].filter(Boolean).join(' · ')
}

async function fetchScheduleVacancies(
  courseId: string
): Promise<ScheduleVacancySummary[]> {
  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}`)
  if (!response.ok) {
    throw new Error(`Falha ao buscar o curso (${response.status})`)
  }
  const body: unknown = await response.json()
  const course =
    typeof body === 'object' && body !== null && 'course' in body
      ? body.course
      : null
  return getScheduleVacancySummaries(course)
}

async function fetchScheduleOutcomes(
  courseId: string
): Promise<Map<string, ScheduleOutcomeCounts>> {
  const lists = await Promise.all(
    SCHEDULE_OUTCOME_STATUSES.map(status =>
      fetchAllEnrollmentsWithStatus(courseId, status)
    )
  )
  return countScheduleOutcomes(lists.flat())
}

async function fetchAllEnrollmentsWithStatus(
  courseId: string,
  status: string
): Promise<unknown[]> {
  const result = await fetchAllEnrollmentPages<unknown>(async (page, limit) => {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(limit),
      status,
    })
    const response = await fetch(
      `/api/enrollments/${encodeURIComponent(courseId)}?${params.toString()}`
    )
    if (!response.ok) return { error: response.status }
    return parseEnrollmentsPage(await response.json())
  })
  if (!result.ok) {
    throw new Error(
      result.reason === 'too_many'
        ? `Inscrições demais para contar por turma (${result.total})`
        : `Falha ao buscar inscrições (${result.status})`
    )
  }
  return result.items
}

function parseEnrollmentsPage(body: unknown): EnrollmentsPage<unknown> {
  if (typeof body !== 'object' || body === null) return { items: [], total: 0 }
  const items =
    'enrollments' in body && Array.isArray(body.enrollments)
      ? body.enrollments
      : []
  const pagination =
    'pagination' in body &&
    typeof body.pagination === 'object' &&
    body.pagination !== null
      ? body.pagination
      : null
  const total =
    pagination && 'total' in pagination && typeof pagination.total === 'number'
      ? pagination.total
      : items.length
  return { items, total }
}

const NUMERIC_CELL = 'text-right font-mono tabular-nums'

const STATUS_ORDER: ScheduleVacancyStatus[] = [
  'disponivel',
  'quase-lotado',
  'esgotado',
]

const STATUS_STYLES: Record<ScheduleVacancyStatus, StatusStyle> = {
  disponivel: {
    label: 'Disponível',
    legend: 'Disponível (mais de 20% das vagas livres)',
    border: 'border-l-green-600',
    dot: 'bg-green-600',
    percentText: '',
  },
  'quase-lotado': {
    label: 'Quase lotado',
    legend: 'Quase lotado (até 20% das vagas livres)',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
    percentText: 'text-amber-600 dark:text-amber-500',
  },
  esgotado: {
    label: 'Esgotado',
    legend: 'Esgotado (0 vagas)',
    border: 'border-l-destructive',
    dot: 'bg-destructive',
    percentText: 'text-destructive',
  },
}

interface StatusStyle {
  label: string
  legend: string
  border: string
  dot: string
  percentText: string
}
