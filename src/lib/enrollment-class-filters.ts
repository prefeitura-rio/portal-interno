// Filtros por turma (schedule) e por unidade (local presencial) da lista de
// inscritos de um curso. A API Go de inscrições só filtra por status e busca,
// então o BFF busca todas as inscrições do curso e aplica estes filtros.
//
// Módulo puro (sem imports do app) para rodar também em `node --test`.

/** Maior `limit` aceito pela API Go em GET /courses/{id}/enrollments. */
export const ENROLLMENTS_FETCH_PAGE_SIZE = 1000

/** Teto de páginas buscadas para filtrar (50 × 1000 inscrições). */
export const ENROLLMENTS_FETCH_MAX_PAGES = 50

/** Quantidade máxima de ids aceitos em cada parâmetro de filtro. */
export const CLASS_FILTER_MAX_IDS = 100

export const SCHEDULE_IDS_PARAM = 'scheduleIds'
export const UNIT_IDS_PARAM = 'unitIds'

const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

export interface ClassFilter {
  /** Ids das turmas (schedule_id) aceitas; vazio = qualquer turma. */
  scheduleIds: string[]
  /** Ids das unidades (location id) aceitas; vazio = qualquer unidade. */
  unitIds: string[]
}

export type ClassFilterParseResult =
  | { ok: true; filter: ClassFilter }
  | { ok: false; error: string }

/**
 * Lê uma lista de ids separada por vírgula. Retorna `null` quando algum id é
 * inválido ou a lista passa de CLASS_FILTER_MAX_IDS.
 */
export function parseIdListParam(raw: string | null): string[] | null {
  if (raw === null) return []
  const ids = raw
    .split(',')
    .map(id => id.trim())
    .filter(id => id !== '')
  if (ids.length > CLASS_FILTER_MAX_IDS) return null
  if (!ids.every(id => ID_PATTERN.test(id))) return null
  return Array.from(new Set(ids))
}

export function parseClassFilterParams(
  searchParams: URLSearchParams
): ClassFilterParseResult {
  const scheduleIds = parseIdListParam(searchParams.get(SCHEDULE_IDS_PARAM))
  if (scheduleIds === null) {
    return { ok: false, error: 'Parâmetro scheduleIds inválido' }
  }
  const unitIds = parseIdListParam(searchParams.get(UNIT_IDS_PARAM))
  if (unitIds === null) {
    return { ok: false, error: 'Parâmetro unitIds inválido' }
  }
  return { ok: true, filter: { scheduleIds, unitIds } }
}

export function hasClassFilter(filter?: Partial<ClassFilter> | null): boolean {
  return Boolean(
    (filter?.scheduleIds && filter.scheduleIds.length > 0) ||
      (filter?.unitIds && filter.unitIds.length > 0)
  )
}

/** Acrescenta os filtros de turma/unidade à query do BFF de inscrições. */
export function appendClassFilterParams(
  params: URLSearchParams,
  filter?: Partial<ClassFilter> | null
): void {
  if (filter?.scheduleIds && filter.scheduleIds.length > 0) {
    params.append(SCHEDULE_IDS_PARAM, filter.scheduleIds.join(','))
  }
  if (filter?.unitIds && filter.unitIds.length > 0) {
    params.append(UNIT_IDS_PARAM, filter.unitIds.join(','))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Mapa turma (schedule id) → unidade (location id) a partir dos `locations`
 * do curso, no formato da API Go ou no formato já transformado do front.
 *
 * Local no formato antigo (sem lista de turmas) mapeia o próprio id: a
 * inscrição manual desse curso pode gravar o id do local como `schedule_id`.
 */
export function buildScheduleLocationIndex(
  course: unknown
): Map<string, string> {
  const index = new Map<string, string>()
  if (!isRecord(course) || !Array.isArray(course.locations)) return index

  for (const location of course.locations) {
    if (!isRecord(location)) continue
    const locationId = nonEmptyString(location.id)
    if (!locationId) continue
    if (!Array.isArray(location.schedules) || location.schedules.length === 0) {
      index.set(locationId, locationId)
      continue
    }
    for (const schedule of location.schedules) {
      if (!isRecord(schedule)) continue
      const scheduleId = nonEmptyString(schedule.id)
      if (scheduleId) index.set(scheduleId, locationId)
    }
  }
  return index
}

export interface ClassFilterableEnrollment {
  schedule_id?: string | null
  enrolled_unit?: { id?: string | null } | null
}

/** Unidade da inscrição: o local da turma ou, sem turma, a unidade gravada. */
export function resolveEnrollmentUnitId(
  enrollment: ClassFilterableEnrollment,
  scheduleLocationIndex: Map<string, string>
): string | undefined {
  const scheduleId = nonEmptyString(enrollment.schedule_id)
  const fromSchedule = scheduleId
    ? scheduleLocationIndex.get(scheduleId)
    : undefined
  return fromSchedule ?? nonEmptyString(enrollment.enrolled_unit?.id)
}

export function matchesClassFilter(
  enrollment: ClassFilterableEnrollment,
  filter: ClassFilter,
  scheduleLocationIndex: Map<string, string>
): boolean {
  if (filter.scheduleIds.length > 0) {
    const scheduleId = nonEmptyString(enrollment.schedule_id)
    if (!scheduleId || !filter.scheduleIds.includes(scheduleId)) return false
  }
  if (filter.unitIds.length > 0) {
    const unitId = resolveEnrollmentUnitId(enrollment, scheduleLocationIndex)
    if (!unitId || !filter.unitIds.includes(unitId)) return false
  }
  return true
}

export interface StatusCountable {
  status?: string | null
}

/** Resumo por situação no formato da API Go (`data.summary`). */
export interface EnrollmentStatusCounts {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  concluded: number
}

/**
 * Conta as inscrições por situação, como o resumo da API Go faz para o curso
 * inteiro. Usado quando há filtro de turma/unidade, para os cards de resumo
 * refletirem só as inscrições filtradas.
 */
export function countEnrollmentsByStatus(
  enrollments: StatusCountable[]
): EnrollmentStatusCounts {
  const counts: EnrollmentStatusCounts = {
    total: enrollments.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    concluded: 0,
  }
  for (const enrollment of enrollments) {
    switch (enrollment.status) {
      case 'pending':
        counts.pending += 1
        break
      case 'approved':
        counts.approved += 1
        break
      case 'rejected':
        counts.rejected += 1
        break
      case 'cancelled':
        counts.cancelled += 1
        break
      case 'concluded':
        counts.concluded += 1
        break
    }
  }
  return counts
}

export interface EnrollmentsPage<T> {
  items: T[]
  total: number
}

export type FetchAllEnrollmentsResult<T> =
  | { ok: true; items: T[]; firstPage: EnrollmentsPage<T> }
  | { ok: false; reason: 'upstream'; status: number }
  | { ok: false; reason: 'too_many'; total: number }

/**
 * Busca todas as páginas de inscrições. `fetchPage` devolve a página ou o
 * status HTTP do erro. Recusa (`too_many`) cursos acima do teto em vez de
 * filtrar um subconjunto truncado.
 */
export async function fetchAllEnrollmentPages<T>(
  fetchPage: (
    page: number,
    limit: number
  ) => Promise<EnrollmentsPage<T> | { error: number }>,
  pageSize: number = ENROLLMENTS_FETCH_PAGE_SIZE,
  maxPages: number = ENROLLMENTS_FETCH_MAX_PAGES
): Promise<FetchAllEnrollmentsResult<T>> {
  const first = await fetchPage(1, pageSize)
  if ('error' in first) {
    return { ok: false, reason: 'upstream', status: first.error }
  }
  if (first.total > pageSize * maxPages) {
    return { ok: false, reason: 'too_many', total: first.total }
  }

  const items = [...first.items]
  let page = 1
  let lastPageSize = first.items.length
  while (items.length < first.total && lastPageSize > 0 && page < maxPages) {
    page += 1
    const next = await fetchPage(page, pageSize)
    if ('error' in next) {
      return { ok: false, reason: 'upstream', status: next.error }
    }
    items.push(...next.items)
    lastPageSize = next.items.length
  }

  return { ok: true, items, firstPage: first }
}

export interface EnrollmentListQuery {
  status?: string
  search?: string
}

export type LoadClassFilteredResult<T> =
  | { ok: true; items: T[]; summary: EnrollmentStatusCounts }
  | { ok: false; reason: 'upstream'; status: number }
  | { ok: false; reason: 'too_many'; total: number }

/**
 * Inscrições do curso que casam com o filtro de turma/unidade.
 *
 * `summary` segue o resumo da API Go, que conta o curso inteiro sem status
 * nem busca: aqui conta as inscrições da turma/unidade em todas as situações.
 * `items` é a lista restrita também por status e busca. O status é filtrado
 * localmente; a busca (regra da API Go) exige uma segunda leitura com ela.
 */
export async function loadClassFilteredEnrollments<
  T extends ClassFilterableEnrollment & StatusCountable,
>(
  fetchPage: (
    page: number,
    limit: number,
    query: EnrollmentListQuery
  ) => Promise<EnrollmentsPage<T> | { error: number }>,
  filter: ClassFilter,
  scheduleLocationIndex: Map<string, string>,
  query: EnrollmentListQuery,
  pageSize: number = ENROLLMENTS_FETCH_PAGE_SIZE,
  maxPages: number = ENROLLMENTS_FETCH_MAX_PAGES
): Promise<LoadClassFilteredResult<T>> {
  const fetchMatching = async (
    pageQuery: EnrollmentListQuery
  ): Promise<FetchAllEnrollmentsResult<T>> => {
    const result = await fetchAllEnrollmentPages<T>(
      (page, limit) => fetchPage(page, limit, pageQuery),
      pageSize,
      maxPages
    )
    if (!result.ok) return result
    return {
      ...result,
      items: result.items.filter(enrollment =>
        matchesClassFilter(enrollment, filter, scheduleLocationIndex)
      ),
    }
  }

  const classResult = await fetchMatching({})
  if (!classResult.ok) return classResult
  const summary = countEnrollmentsByStatus(classResult.items)

  if (query.search) {
    const listResult = await fetchMatching(query)
    if (!listResult.ok) return listResult
    return { ok: true, items: listResult.items, summary }
  }

  const items = query.status
    ? classResult.items.filter(enrollment => enrollment.status === query.status)
    : classResult.items
  return { ok: true, items, summary }
}

export interface LocalPage<T> {
  items: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export function paginateLocally<T>(
  items: T[],
  page: number,
  perPage: number
): LocalPage<T> {
  const safePerPage = Number.isFinite(perPage)
    ? Math.max(1, Math.floor(perPage))
    : 10
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const start = (safePage - 1) * safePerPage
  return {
    items: items.slice(start, start + safePerPage),
    pagination: {
      page: safePage,
      perPage: safePerPage,
      total: items.length,
      totalPages: Math.ceil(items.length / safePerPage),
    },
  }
}
