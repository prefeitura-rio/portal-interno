'use client'

import { Badge } from '@/components/ui/badge'
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
  type ScheduleVacancySummary,
  getScheduleVacancySummaries,
} from '@/lib/course-schedule-vacancies'
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
            <TableHead>Local</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead className="text-right">Vagas</TableHead>
            <TableHead className="text-right">Ocupadas</TableHead>
            <TableHead className="text-right">Disponíveis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(schedule => (
            <TableRow key={schedule.id}>
              <TableCell className="whitespace-normal">
                {schedule.local}
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="font-medium">{schedule.turma}</div>
                {formatScheduleDetails(schedule) && (
                  <div className="text-xs text-muted-foreground">
                    {formatScheduleDetails(schedule)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">{schedule.vagas}</TableCell>
              <TableCell className="text-right">
                {schedule.ocupadas ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                {schedule.disponiveis === null ? (
                  '—'
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    {schedule.disponiveis === 0 && (
                      <Badge variant="destructive">Esgotada</Badge>
                    )}
                    <span>{schedule.disponiveis}</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
        Ocupadas = inscrições confirmadas e concluídas na turma.
      </p>
    </div>
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
