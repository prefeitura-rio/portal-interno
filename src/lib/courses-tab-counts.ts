/**
 * Contagem de cursos por aba da listagem de cursos (DEV-59, mesmo padrão
 * das vagas em DEV-29). Cada contagem vem do `pagination.total` do BFF da
 * aba, consultado com `per_page=1`: é o total real da aba no backend, não a
 * quantidade de itens da página exibida.
 */

export type CourseTab = 'created' | 'in_review' | 'needs_changes' | 'draft'

/** BFF que lista os cursos de cada aba (o mesmo que a tabela consulta). */
export const COURSE_TAB_ENDPOINTS: Readonly<Record<CourseTab, string>> = {
  created: '/api/courses',
  in_review: '/api/courses/in-review',
  needs_changes: '/api/courses/needs-changes',
  draft: '/api/courses/drafts',
}

/** Total por aba; aba ausente = contagem indisponível. */
export type CourseTabCounts = Partial<Record<CourseTab, number>>

export interface CourseTabCountFilters {
  /** Busca parcial no título do curso */
  search?: string
}

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/** URL do BFF que devolve só o total de cursos de uma aba. */
export function buildCourseTabCountUrl(
  tab: CourseTab,
  filters: CourseTabCountFilters,
  origin: string
): string {
  const url = new URL(COURSE_TAB_ENDPOINTS[tab], origin)
  url.searchParams.set('page', '1')
  url.searchParams.set('per_page', '1')

  const search = filters.search?.trim()
  if (search) {
    url.searchParams.set('search', search)
  }

  return url.toString()
}

/**
 * Lê `pagination.total` da resposta do BFF; `null` quando ausente ou
 * inválido. O campo `total` da raiz não é usado: no BFF de rascunhos ele cai
 * para a quantidade de itens da página quando falta a paginação.
 */
export function parseCourseTabTotal(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null
  const pagination = (body as { pagination?: unknown }).pagination
  if (typeof pagination !== 'object' || pagination === null) return null
  const total = (pagination as { total?: unknown }).total
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    return null
  }
  return total
}

/**
 * Busca, em paralelo, o total de cada aba. A falha de uma aba não derruba
 * as demais: ela só fica fora do resultado (sem contagem no rótulo).
 */
export async function fetchCourseTabCounts(
  tabs: readonly CourseTab[],
  filters: CourseTabCountFilters,
  fetchFn: FetchLike,
  origin: string,
  signal?: AbortSignal
): Promise<CourseTabCounts> {
  const results = await Promise.all(
    tabs.map(async tab => {
      try {
        const response = await fetchFn(
          buildCourseTabCountUrl(tab, filters, origin),
          { signal }
        )
        if (!response.ok) return [tab, null] as const
        return [tab, parseCourseTabTotal(await response.json())] as const
      } catch {
        return [tab, null] as const
      }
    })
  )

  const counts: CourseTabCounts = {}
  for (const [tab, total] of results) {
    if (total !== null) {
      counts[tab] = total
    }
  }
  return counts
}
