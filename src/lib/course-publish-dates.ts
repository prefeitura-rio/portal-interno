// DEV-152: as rotas do BFF que levam um curso a publicado (aprovar, publicar e
// os atalhos "Publicar diretamente") recusam com 422 um curso cuja turma começa
// as aulas antes do início das inscrições. A regra ficava duplicada em
// `approve` e `publish` e faltava nos atalhos, que publicavam o curso com as
// datas inconsistentes.

export const COURSE_DATES_ERROR_MESSAGE =
  'A data de início das aulas deve ser igual ou posterior ao início das inscrições.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Turmas do curso no formato da API de cursos: as presenciais em
 * `locations[].schedules[]` e as online em `remote_class`, que chega como array
 * de turmas ou como objeto com `.schedules`.
 */
function courseSchedules(course: Record<string, unknown>): unknown[] {
  const presencial = asArray(course.locations).flatMap(location =>
    isRecord(location) ? asArray(location.schedules) : []
  )
  const remoteClass = course.remote_class
  const online = Array.isArray(remoteClass)
    ? remoteClass
    : isRecord(remoteClass)
      ? asArray(remoteClass.schedules)
      : []
  return [...presencial, ...online]
}

/**
 * Mensagem de erro quando alguma turma do curso tem `class_start_date` anterior
 * ao `enrollment_start_date` do curso, ou `null` quando as datas estão
 * consistentes (ou ausentes/inválidas, que outra validação trata).
 */
export function validateCourseDates(courseData: unknown): string | null {
  if (!isRecord(courseData)) return null
  const enrollmentStart = parseDate(courseData.enrollment_start_date)
  if (!enrollmentStart) return null

  for (const schedule of courseSchedules(courseData)) {
    if (!isRecord(schedule)) continue
    const classStart = parseDate(schedule.class_start_date)
    if (classStart && classStart < enrollmentStart) {
      return COURSE_DATES_ERROR_MESSAGE
    }
  }
  return null
}

/**
 * Busca o curso na API de cursos e valida as datas dele. Devolve a mensagem de
 * erro ou `null`. Se a API não devolver o curso, não bloqueia (a ação segue e
 * a API de cursos responde por ela), como `approve` e `publish` já faziam.
 */
export async function fetchCourseDatesError(
  baseUrl: string | undefined,
  courseId: string,
  accessToken: string
): Promise<string | null> {
  const courseResponse = await fetch(`${baseUrl}/api/v1/courses/${courseId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!courseResponse.ok) return null

  const courseResult: unknown = await courseResponse.json()
  const courseData = isRecord(courseResult)
    ? (courseResult.data ?? courseResult)
    : courseResult
  return validateCourseDates(courseData)
}
