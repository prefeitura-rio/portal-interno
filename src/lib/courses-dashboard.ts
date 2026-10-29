/**
 * Dashboard de Capacitações da Casa Civil (DEV-100): tração por secretaria.
 *
 * A API Go não tem endpoint de consolidado, então o BFF
 * `/api/courses/dashboard` lista os cursos publicados (todas as páginas) e
 * soma, por secretaria (`orgao_id`), os cursos e as inscrições de cada um
 * (`pagination.total` da listagem de inscrições do curso, sem filtro). As
 * contagens ficam num cache curto no servidor, com novas tentativas e uma
 * reserva da última contagem boa (DEV-112): a rajada de uma consulta por
 * curso esbarrava no limite de taxa e deixava a maioria sem contagem.
 *
 * O nome de cada secretaria também sai daqui (`resolveSecretarias`), em lote
 * controlado no servidor: pedir os nomes do navegador, um por linha e todos
 * ao mesmo tempo, esbarrava no limite de taxa da RMI.
 *
 * Este módulo não depende do Next: recebe as chamadas à API como funções, para
 * ser testado com respostas sintéticas.
 */

import type { DepartmentLookup } from './department-names'

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

/**
 * Consultas simultâneas de inscrições. Cada carga consulta um curso por vez
 * em cada worker: com 8, a rajada esbarrava no limite de taxa da API Go e
 * deixava a maioria dos cursos sem contagem (DEV-112).
 */
export const DASHBOARD_ENROLLMENT_CONCURRENCY = 4

/** Tentativas por curso (a primeira e as novas tentativas). */
export const DASHBOARD_ENROLLMENT_MAX_ATTEMPTS = 3

/** Espera antes da 2ª tentativa; dobra a cada nova tentativa. */
export const DASHBOARD_ENROLLMENT_BASE_DELAY_MS = 500

/** Maior espera entre tentativas, também para `Retry-After`. */
export const DASHBOARD_ENROLLMENT_MAX_DELAY_MS = 5_000

/** Tempo total para contar as inscrições de uma carga do dashboard. */
export const DASHBOARD_ENROLLMENT_DEADLINE_MS = 20_000

/** Tempo máximo de uma consulta (limitado também ao que resta do prazo). */
export const DASHBOARD_ENROLLMENT_REQUEST_TIMEOUT_MS = 8_000

/**
 * Validade da contagem no cache: dentro dela, a carga seguinte (outro
 * usuário, "Atualizar", revalidação automática) não consulta o curso de novo.
 */
export const ENROLLMENT_COUNT_FRESH_TTL_MS = 10 * 60 * 1000

/**
 * Por quanto tempo a última contagem boa serve de reserva quando a consulta
 * do curso falha de forma passageira (limite de taxa, 5xx, rede, prazo).
 */
export const ENROLLMENT_COUNT_STALE_TTL_MS = 24 * 60 * 60 * 1000

/** Limite de cursos guardados no cache. */
export const ENROLLMENT_COUNT_CACHE_MAX_ENTRIES = 5_000

/** Resposta de uma chamada à API Go (formato dos clientes Orval). */
export interface DashboardApiResult {
  status: number
  data: unknown
  headers?: Headers | null
}

export type ListPublishedCoursesPage = (
  page: number,
  limit: number
) => Promise<DashboardApiResult>

/** `signal` aborta a consulta quando ela passa do tempo dela. */
export type FetchCourseEnrollments = (
  courseId: number,
  signal: AbortSignal
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

/** Agrupamento por secretaria, antes de resolver os nomes. */
export interface CoursesTractionAggregate {
  secretarias: SecretariaTraction[]
  totals: CoursesDashboardTotals
}

export interface SecretariaTractionRow extends SecretariaTraction {
  /** Nome da secretaria na RMI; `null` na linha dos cursos sem secretaria. */
  secretaria: DepartmentLookup | null
}

export interface CoursesDashboardSummary {
  secretarias: SecretariaTractionRow[]
  totals: CoursesDashboardTotals
  /** Secretarias cujo nome a RMI não devolveu a tempo nesta carga. */
  secretariasWithoutName: number
}

export type ResolveSecretarias = (
  orgaoIds: readonly string[]
) => Promise<ReadonlyMap<string, DepartmentLookup>>

export type CoursesDashboardResult =
  | {
      ok: true
      summary: CoursesDashboardSummary
      enrollmentStats: EnrollmentCountsStats
    }
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

interface EnrollmentCountEntry {
  count: number
  storedAt: number
}

/**
 * Contagens de inscrições entre as cargas do dashboard. Guarda só contagens
 * que a API Go devolveu; falha não fica. A mesma entrada serve de valor
 * fresco (`getFresh`) e, depois, de reserva (`getStale`).
 */
export class EnrollmentCountCache {
  private readonly entries = new Map<number, EnrollmentCountEntry>()
  private readonly now: () => number
  private readonly maxEntries: number

  constructor(
    now: () => number = Date.now,
    maxEntries = ENROLLMENT_COUNT_CACHE_MAX_ENTRIES
  ) {
    this.now = now
    this.maxEntries = maxEntries
  }

  private read(courseId: number, ttlMs: number): number | null {
    const entry = this.entries.get(courseId)
    if (!entry) return null
    const age = this.now() - entry.storedAt
    if (age >= ENROLLMENT_COUNT_STALE_TTL_MS) {
      this.entries.delete(courseId)
      return null
    }
    return age < ttlMs ? entry.count : null
  }

  getFresh(courseId: number): number | null {
    return this.read(courseId, ENROLLMENT_COUNT_FRESH_TTL_MS)
  }

  getStale(courseId: number): number | null {
    return this.read(courseId, ENROLLMENT_COUNT_STALE_TTL_MS)
  }

  set(courseId: number, count: number): void {
    this.entries.delete(courseId)
    this.entries.set(courseId, { count, storedAt: this.now() })
    // Map guarda a ordem de inserção: o primeiro é o mais antigo
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }

  get size(): number {
    return this.entries.size
  }
}

/** Cache do processo do servidor, compartilhado pelas cargas do dashboard. */
export const enrollmentCountCache = new EnrollmentCountCache()

export interface CountEnrollmentsOptions {
  cache?: EnrollmentCountCache
  concurrency?: number
  maxAttempts?: number
  deadlineMs?: number
  requestTimeoutMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

/** Como terminou a contagem de inscrições de uma carga (sem ids de curso). */
export interface EnrollmentCountsStats {
  /** Cursos contados por consulta à API Go nesta carga. */
  fetched: number
  /** Cursos com contagem fresca no cache, sem consulta. */
  fromCache: number
  /** Cursos cuja consulta falhou e que usaram a última contagem boa. */
  fromStale: number
  /** Cursos sem contagem (fora da soma). */
  failed: number
  /**
   * Motivo da última falha de cada curso que não foi contado nesta carga
   * (status HTTP, `network`, `timeout`, `invalid` ou `deadline`).
   */
  failures: Record<string, number>
}

export interface EnrollmentCountsResult {
  counts: Map<number, number | null>
  stats: EnrollmentCountsStats
}

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * `Retry-After` em milissegundos: segundos inteiros ou data HTTP. `null`
 * quando ausente ou inválido (mesma regra de `department-names.ts`).
 */
function retryAfterMs(
  headers: Headers | null | undefined,
  now: number
): number | null {
  const value = headers?.get('retry-after')?.trim()
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value) * 1000
  const date = Date.parse(value)
  if (Number.isNaN(date)) return null
  return Math.max(0, date - now)
}

class EnrollmentRequestTimeout extends Error {}

/**
 * Consulta com tempo máximo: aborta o `signal` e rejeita ao estourar, mesmo
 * que a chamada ignore o `signal`.
 */
async function fetchWithTimeout(
  fetchEnrollments: FetchCourseEnrollments,
  courseId: number,
  timeoutMs: number
): Promise<DashboardApiResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new EnrollmentRequestTimeout())
    }, timeoutMs)
  })
  try {
    return await Promise.race([
      fetchEnrollments(courseId, controller.signal),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
  }
}

type EnrollmentLookup =
  | { ok: true; count: number }
  /** `allowStale` é falso quando a API negou acesso ao curso (401/403). */
  | { ok: false; reason: string; allowStale: boolean }

/**
 * Conta as inscrições de cada curso. Contagem fresca no cache não é
 * consultada; as demais saem com no máximo `concurrency` consultas ao mesmo
 * tempo, cada uma com tempo máximo. 429, 5xx, erro de rede e consulta lenta
 * tentam de novo depois de `Retry-After` (ou de um recuo exponencial), até
 * `maxAttempts` ou até o prazo da carga; depois de um 429, todos os workers
 * esperam antes da próxima consulta, para não insistir na rajada. Curso que
 * não deu para contar usa a última contagem boa do cache (salvo acesso
 * negado) ou fica `null` (fora da soma, e contado como sem contagem).
 * Esgotado o prazo, os cursos restantes não são consultados.
 */
export async function countEnrollmentsByCourse(
  courseIds: readonly number[],
  fetchEnrollments: FetchCourseEnrollments,
  options: CountEnrollmentsOptions = {}
): Promise<EnrollmentCountsResult> {
  const cache = options.cache ?? enrollmentCountCache
  const concurrency = options.concurrency ?? DASHBOARD_ENROLLMENT_CONCURRENCY
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? DASHBOARD_ENROLLMENT_MAX_ATTEMPTS
  )
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const requestTimeoutMs =
    options.requestTimeoutMs ?? DASHBOARD_ENROLLMENT_REQUEST_TIMEOUT_MS
  const deadline =
    now() + (options.deadlineMs ?? DASHBOARD_ENROLLMENT_DEADLINE_MS)

  const counts = new Map<number, number | null>()
  const stats: EnrollmentCountsStats = {
    fetched: 0,
    fromCache: 0,
    fromStale: 0,
    failed: 0,
    failures: {},
  }

  // Cursos nunca contados vão antes dos que já têm reserva no cache: se o
  // prazo acabar, quem fica sem consulta ainda tem um número
  const withoutStale: number[] = []
  const withStale: number[] = []
  for (const courseId of new Set(courseIds)) {
    const fresh = cache.getFresh(courseId)
    if (fresh !== null) {
      counts.set(courseId, fresh)
      stats.fromCache += 1
    } else if (cache.getStale(courseId) !== null) {
      withStale.push(courseId)
    } else {
      withoutStale.push(courseId)
    }
  }
  const pending = [...withoutStale, ...withStale]

  let outOfTime = false
  // Depois de um 429, nenhuma consulta sai antes deste instante
  let pausedUntil = 0
  const deadlineReached: EnrollmentLookup = {
    ok: false,
    reason: 'deadline',
    allowStale: true,
  }

  async function lookup(courseId: number): Promise<EnrollmentLookup> {
    let last: EnrollmentLookup = deadlineReached
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const pause = pausedUntil - now()
      if (pause > 0) {
        if (now() + pause >= deadline) {
          outOfTime = true
          return last
        }
        await sleep(pause)
      }
      if (outOfTime || now() >= deadline) {
        outOfTime = true
        return last
      }

      let retryAfter: number | null = null
      try {
        const response = await fetchWithTimeout(
          fetchEnrollments,
          courseId,
          Math.max(1, Math.min(requestTimeoutMs, deadline - now()))
        )
        if (isSuccess(response.status)) {
          const count = parseEnrollmentTotal(response.data)
          return count === null
            ? { ok: false, reason: 'invalid', allowStale: true }
            : { ok: true, count }
        }
        const reason = String(response.status)
        if (response.status === 401 || response.status === 403) {
          return { ok: false, reason, allowStale: false }
        }
        if (!isRetryable(response.status)) {
          return { ok: false, reason, allowStale: true }
        }
        last = { ok: false, reason, allowStale: true }
        retryAfter = retryAfterMs(response.headers, now())
      } catch (error) {
        last = {
          ok: false,
          reason:
            error instanceof EnrollmentRequestTimeout ? 'timeout' : 'network',
          allowStale: true,
        }
      }

      if (attempt === maxAttempts) break
      const delay = Math.min(
        retryAfter ?? DASHBOARD_ENROLLMENT_BASE_DELAY_MS * 2 ** (attempt - 1),
        DASHBOARD_ENROLLMENT_MAX_DELAY_MS
      )
      if (!last.ok && last.reason === '429') {
        pausedUntil = Math.max(pausedUntil, now() + delay)
      }
      if (now() + delay >= deadline) {
        outOfTime = true
        break
      }
      await sleep(delay)
    }
    return last
  }

  let next = 0
  async function worker(): Promise<void> {
    while (next < pending.length) {
      const courseId = pending[next]
      next += 1
      const found = outOfTime ? deadlineReached : await lookup(courseId)
      if (found.ok) {
        cache.set(courseId, found.count)
        counts.set(courseId, found.count)
        stats.fetched += 1
        continue
      }
      stats.failures[found.reason] = (stats.failures[found.reason] ?? 0) + 1
      const stale = found.allowStale ? cache.getStale(courseId) : null
      counts.set(courseId, stale)
      if (stale === null) {
        stats.failed += 1
      } else {
        stats.fromStale += 1
      }
    }
  }

  const workers = Math.max(1, Math.min(concurrency, pending.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return { counts, stats }
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
): CoursesTractionAggregate {
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

/**
 * Junta o nome de cada secretaria às linhas do agrupamento. Código sem
 * resposta da busca de nomes conta como indisponível.
 */
export function attachSecretariaNames(
  aggregate: CoursesTractionAggregate,
  names: ReadonlyMap<string, DepartmentLookup>
): CoursesDashboardSummary {
  let secretariasWithoutName = 0
  const secretarias = aggregate.secretarias.map(row => {
    if (row.orgaoId === null) return { ...row, secretaria: null }
    const secretaria: DepartmentLookup = names.get(row.orgaoId) ?? {
      status: 'unavailable',
    }
    if (secretaria.status === 'unavailable') secretariasWithoutName += 1
    return { ...row, secretaria }
  })
  return { secretarias, totals: aggregate.totals, secretariasWithoutName }
}

/** Consolidado de cursos publicados e inscrições por secretaria. */
export async function buildCoursesDashboard(deps: {
  listPublishedCoursesPage: ListPublishedCoursesPage
  fetchCourseEnrollments: FetchCourseEnrollments
  resolveSecretarias: ResolveSecretarias
  enrollmentCountOptions?: CountEnrollmentsOptions
}): Promise<CoursesDashboardResult> {
  const courses = await fetchAllPublishedCourses(deps.listPublishedCoursesPage)
  if (!courses.ok) return courses

  const orgaoIds = [
    ...new Set(
      courses.courses
        .map(course => course.orgaoId)
        .filter((orgaoId): orgaoId is string => orgaoId !== null)
    ),
  ]

  // Inscrições vêm da API Go e nomes da RMI: as duas buscas correm juntas.
  // Falha inesperada na busca de nomes não derruba os totais.
  const [enrollments, names] = await Promise.all([
    countEnrollmentsByCourse(
      courses.courses.map(course => course.id),
      deps.fetchCourseEnrollments,
      deps.enrollmentCountOptions
    ),
    deps
      .resolveSecretarias(orgaoIds)
      .catch(() => new Map<string, DepartmentLookup>()),
  ])

  return {
    ok: true,
    summary: attachSecretariaNames(
      aggregateBySecretaria(courses.courses, enrollments.counts),
      names
    ),
    enrollmentStats: enrollments.stats,
  }
}
