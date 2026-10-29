/**
 * Dashboard de Capacitações da Casa Civil (DEV-100): tração por secretaria.
 *
 * A API Go não tem endpoint de consolidado, então o BFF
 * `/api/courses/dashboard` lista os cursos publicados (todas as páginas) e
 * soma, por secretaria (`orgao_id`), os cursos e as inscrições de cada um
 * (`pagination.total` da listagem de inscrições do curso, sem filtro).
 *
 * Este módulo não depende do Next: recebe as chamadas à API como funções, para
 * ser testado com respostas sintéticas.
 */

/**
 * Status de curso publicado: os da aba "Cursos Criados" que aparecem com o
 * selo "Publicado" (ou um status derivado dele). Na API Go, os derivados
 * (scheduled, accepting_enrollments, in_progress, finished) são recortes de
 * `published`, por isso vão todos no filtro.
 */
export const DASHBOARD_PUBLISHED_STATUSES = [
  'opened',
  'published',
  'scheduled',
  'accepting_enrollments',
  'in_progress',
  'finished',
] as const

/** Maior página que a API Go aceita na listagem de cursos. */
export const DASHBOARD_COURSES_PAGE_SIZE = 1000

/** Limite de páginas lidas, para não entrar em laço com resposta inválida. */
export const DASHBOARD_MAX_COURSE_PAGES = 50

/** Consultas simultâneas de inscrições, para não sobrecarregar a API Go. */
export const DASHBOARD_ENROLLMENT_CONCURRENCY = 8

/** Resposta de uma chamada à API Go (formato dos clientes Orval). */
export interface DashboardApiResult {
  status: number
  data: unknown
}

export type ListPublishedCoursesPage = (
  page: number,
  limit: number
) => Promise<DashboardApiResult>

export type FetchCourseEnrollments = (
  courseId: number
) => Promise<DashboardApiResult>

export interface PublishedCourseRef {
  id: number
  /** Secretaria (cd_ua) dona do curso; `null` quando não informada. */
  orgaoId: string | null
}

export interface CoursesPage {
  courses: PublishedCourseRef[]
  total: number
  totalPages: number
}

export interface SecretariaTraction {
  /** cd_ua da secretaria; `null` agrupa os cursos sem secretaria. */
  orgaoId: string | null
  publishedCourses: number
  /** Soma das inscrições dos cursos cuja contagem veio da API. */
  totalEnrollments: number
  /** Cursos cuja contagem de inscrições falhou (fora da soma). */
  coursesWithoutEnrollmentCount: number
}

export interface CoursesDashboardTotals {
  publishedCourses: number
  totalEnrollments: number
  coursesWithoutEnrollmentCount: number
}

export interface CoursesDashboardSummary {
  secretarias: SecretariaTraction[]
  totals: CoursesDashboardTotals
}

export type CoursesDashboardResult =
  | { ok: true; summary: CoursesDashboardSummary }
  | { ok: false; status: number }

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null
}

/** A API Go embrulha o corpo em `data`; aceita também o corpo sem embrulho. */
function unwrapData(body: unknown): Record<string, unknown> | null {
  const record = asRecord(body)
  if (!record) return null
  return asRecord(record.data) ?? record
}

function normalizeOrgaoId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Lê uma página da listagem de cursos da API Go. Curso sem id inteiro
 * positivo é descartado; página sem `courses` ou sem `pagination.total`
 * válido é inválida (`null`).
 */
export function parseCoursesPage(body: unknown): CoursesPage | null {
  const data = unwrapData(body)
  if (!data || !Array.isArray(data.courses)) return null

  const pagination = asRecord(data.pagination)
  const total = asNonNegativeInteger(pagination?.total)
  if (total === null) return null
  const totalPages = asNonNegativeInteger(pagination?.total_pages) ?? 0

  const courses: PublishedCourseRef[] = []
  for (const item of data.courses) {
    const course = asRecord(item)
    const id = course?.id
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) continue
    courses.push({ id, orgaoId: normalizeOrgaoId(course?.orgao_id) })
  }

  return { courses, total, totalPages }
}

/**
 * Total de inscrições de um curso: `pagination.total` da listagem sem
 * filtro (o mesmo total da lista de inscritos do curso). `null` quando
 * ausente ou inválido.
 */
export function parseEnrollmentTotal(body: unknown): number | null {
  const data = unwrapData(body)
  if (!data) return null
  return asNonNegativeInteger(asRecord(data.pagination)?.total)
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300
}

/**
 * Lê todas as páginas de cursos publicados, sem repetir curso (a lista pode
 * mudar entre uma página e outra). Falha de qualquer página devolve o status
 * dela (ou 502 para resposta inválida): um consolidado sem parte dos cursos
 * seria um número errado.
 */
export async function fetchAllPublishedCourses(
  listPage: ListPublishedCoursesPage,
  pageSize = DASHBOARD_COURSES_PAGE_SIZE,
  maxPages = DASHBOARD_MAX_COURSE_PAGES
): Promise<
  { ok: true; courses: PublishedCourseRef[] } | { ok: false; status: number }
> {
  const byId = new Map<number, PublishedCourseRef>()

  for (let page = 1; page <= maxPages; page++) {
    const response = await listPage(page, pageSize)
    if (!isSuccess(response.status)) {
      return { ok: false, status: response.status }
    }
    const parsed = parseCoursesPage(response.data)
    if (!parsed) return { ok: false, status: 502 }

    for (const course of parsed.courses) {
      if (!byId.has(course.id)) byId.set(course.id, course)
    }

    const lastPage = parsed.totalPages || Math.ceil(parsed.total / pageSize)
    if (parsed.courses.length === 0 || page >= lastPage) {
      return { ok: true, courses: [...byId.values()] }
    }
  }

  // Mais páginas do que o limite: o consolidado ficaria incompleto
  return { ok: false, status: 502 }
}

/**
 * Conta as inscrições de cada curso, com no máximo `concurrency` consultas
 * ao mesmo tempo. Falha de um curso não derruba os demais: ele fica com
 * `null` (fora da soma, e contado como sem contagem).
 */
export async function countEnrollmentsByCourse(
  courseIds: readonly number[],
  fetchEnrollments: FetchCourseEnrollments,
  concurrency = DASHBOARD_ENROLLMENT_CONCURRENCY
): Promise<Map<number, number | null>> {
  const counts = new Map<number, number | null>()
  let next = 0

  async function worker(): Promise<void> {
    while (next < courseIds.length) {
      const courseId = courseIds[next]
      next += 1
      try {
        const response = await fetchEnrollments(courseId)
        counts.set(
          courseId,
          isSuccess(response.status)
            ? parseEnrollmentTotal(response.data)
            : null
        )
      } catch {
        counts.set(courseId, null)
      }
    }
  }

  const workers = Math.max(1, Math.min(concurrency, courseIds.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return counts
}

function compareTraction(a: SecretariaTraction, b: SecretariaTraction) {
  // Cursos sem secretaria por último
  if (a.orgaoId === null && b.orgaoId !== null) return 1
  if (b.orgaoId === null && a.orgaoId !== null) return -1
  return (
    b.publishedCourses - a.publishedCourses ||
    b.totalEnrollments - a.totalEnrollments ||
    (a.orgaoId ?? '').localeCompare(b.orgaoId ?? '')
  )
}

/**
 * Agrupa os cursos publicados por secretaria, com a soma das inscrições.
 * Ordem: mais cursos publicados primeiro, depois mais inscrições; os cursos
 * sem secretaria ficam na última linha.
 */
export function aggregateBySecretaria(
  courses: readonly PublishedCourseRef[],
  enrollmentCounts: ReadonlyMap<number, number | null>
): CoursesDashboardSummary {
  const bySecretaria = new Map<string | null, SecretariaTraction>()
  const totals: CoursesDashboardTotals = {
    publishedCourses: 0,
    totalEnrollments: 0,
    coursesWithoutEnrollmentCount: 0,
  }

  for (const course of courses) {
    let row = bySecretaria.get(course.orgaoId)
    if (!row) {
      row = {
        orgaoId: course.orgaoId,
        publishedCourses: 0,
        totalEnrollments: 0,
        coursesWithoutEnrollmentCount: 0,
      }
      bySecretaria.set(course.orgaoId, row)
    }

    row.publishedCourses += 1
    totals.publishedCourses += 1

    const enrollments = enrollmentCounts.get(course.id) ?? null
    if (enrollments === null) {
      row.coursesWithoutEnrollmentCount += 1
      totals.coursesWithoutEnrollmentCount += 1
    } else {
      row.totalEnrollments += enrollments
      totals.totalEnrollments += enrollments
    }
  }

  return {
    secretarias: [...bySecretaria.values()].sort(compareTraction),
    totals,
  }
}

/** Consolidado de cursos publicados e inscrições por secretaria. */
export async function buildCoursesDashboard(deps: {
  listPublishedCoursesPage: ListPublishedCoursesPage
  fetchCourseEnrollments: FetchCourseEnrollments
}): Promise<CoursesDashboardResult> {
  const courses = await fetchAllPublishedCourses(deps.listPublishedCoursesPage)
  if (!courses.ok) return courses

  const counts = await countEnrollmentsByCourse(
    courses.courses.map(course => course.id),
    deps.fetchCourseEnrollments
  )
  return { ok: true, summary: aggregateBySecretaria(courses.courses, counts) }
}
