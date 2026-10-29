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
  type ScheduleVacancyStatus,
  type ScheduleVacancySummary,
  formatScheduleOccupancyPercent,
  getScheduleOccupancyPercent,
  getScheduleVacancyStatus,
  getScheduleVacancySummaries,
} from '@/lib/course-schedule-vacancies'
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(schedule => {
            const status = getScheduleVacancyStatus(schedule)
            const statusStyle = status ? STATUS_STYLES[status] : null
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
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
