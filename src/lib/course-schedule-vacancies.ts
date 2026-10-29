// Ocupação de vagas por turma de um curso, a partir da resposta do
// GET /api/v1/courses/{id} da Go API. Cada turma (schedule) traz `vacancies`
// (total de vagas) e `remaining_vacancies` (vagas restantes, calculadas pelo
// backend a partir das inscrições aprovadas e concluídas). Ocupadas = total -
// restantes.

export interface ScheduleVacancySummary {
  id: string
  /** "Turma N", numerada dentro do local (ou das turmas online). */
  turma: string
  /** Endereço (e bairro) da turma presencial, ou "Online". */
  local: string
  dias: string
  horario: string
  vagas: number
  /** null quando a API não informou as vagas restantes da turma. */
  ocupadas: number | null
  /** null quando a API não informou as vagas restantes da turma. */
  disponiveis: number | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function summarizeSchedules(
  schedules: unknown[],
  local: string
): ScheduleVacancySummary[] {
  const summaries: ScheduleVacancySummary[] = []

  for (const schedule of schedules) {
    if (!isRecord(schedule) || !isFiniteNumber(schedule.vacancies)) continue

    const vagas = Math.max(0, Math.trunc(schedule.vacancies))
    const remaining = schedule.remaining_vacancies
    const disponiveis = isFiniteNumber(remaining)
      ? Math.min(vagas, Math.max(0, Math.trunc(remaining)))
      : null

    summaries.push({
      id: asText(schedule.id) || `${local}-${summaries.length + 1}`,
      turma: `Turma ${summaries.length + 1}`,
      local,
      dias: asText(schedule.class_days),
      horario: asText(schedule.class_time),
      vagas,
      ocupadas: disponiveis === null ? null : vagas - disponiveis,
      disponiveis,
    })
  }

  return summaries
}

function formatLocationLabel(location: UnknownRecord): string {
  const address = asText(location.address)
  const neighborhood = asText(location.neighborhood)
  if (address && neighborhood) return `${address} - ${neighborhood}`
  return address || neighborhood || 'Local não informado'
}

export type ScheduleVacancyStatus = 'disponivel' | 'quase-lotado' | 'esgotado'

/**
 * Fração mínima de vagas livres (estrita) para a turma contar como
 * disponível: acima de 20% das vagas livres, ou seja, % Inscritos < 80%.
 */
const AVAILABLE_FREE_RATIO = 0.2

/**
 * % Inscritos = Inscritos ÷ Vagas × 100. null quando a ocupação não é
 * conhecida ou a turma não tem vagas (divisão por zero).
 */
export function getScheduleOccupancyPercent(
  summary: Pick<ScheduleVacancySummary, 'vagas' | 'ocupadas'>
): number | null {
  if (summary.ocupadas === null || summary.vagas <= 0) return null
  return (summary.ocupadas / summary.vagas) * 100
}

export function formatScheduleOccupancyPercent(percent: number | null): string {
  return percent === null ? '—' : `${percent.toFixed(1)}%`
}

/**
 * Esgotado: nenhuma vaga livre. Disponível: mais de 20% das vagas livres.
 * Quase lotado: o restante (há vaga, mas no máximo 20% do total).
 * null quando a API não informou as vagas restantes.
 */
export function getScheduleVacancyStatus(
  summary: Pick<ScheduleVacancySummary, 'vagas' | 'disponiveis'>
): ScheduleVacancyStatus | null {
  if (summary.disponiveis === null) return null
  if (summary.disponiveis <= 0 || summary.vagas <= 0) return 'esgotado'
  return summary.disponiveis / summary.vagas > AVAILABLE_FREE_RATIO
    ? 'disponivel'
    : 'quase-lotado'
}

/**
 * Lista as turmas do curso com total de vagas, ocupadas e disponíveis.
 * Aceita o curso cru da API, embrulhado ou não em `{ data }`.
 * Entrada inválida ou curso sem turmas devolve lista vazia.
 */
export function getScheduleVacancySummaries(
  apiCourse: unknown
): ScheduleVacancySummary[] {
  if (!isRecord(apiCourse)) return []
  const course = isRecord(apiCourse.data) ? apiCourse.data : apiCourse

  const presencial = asArray(course.locations).flatMap(location =>
    isRecord(location)
      ? summarizeSchedules(
          asArray(location.schedules),
          formatLocationLabel(location)
        )
      : []
  )

  const remoteClass = course.remote_class
  const online = isRecord(remoteClass)
    ? summarizeSchedules(asArray(remoteClass.schedules), 'Online')
    : []

  return [...presencial, ...online]
}
