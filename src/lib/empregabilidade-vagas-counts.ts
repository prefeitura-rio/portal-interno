import type { VagaStatus } from '@/lib/status-config/empregabilidade'

/**
 * Contagem de vagas por status para as abas da listagem de empregabilidade
 * (DEV-29). Cada contagem vem do `meta.total` do BFF
 * `/api/empregabilidade/vagas`, consultado com `page_size=1`: é o total real
 * do status no backend, não a quantidade de itens da página exibida.
 */

export const VAGA_COUNT_STATUSES: readonly VagaStatus[] = [
  'publicado_ativo',
  'publicado_expirado',
  'em_aprovacao',
  'em_edicao',
  'vaga_congelada',
  'vaga_descontinuada',
]

/** Total por status; status ausente = contagem indisponível. */
export type VagaCounts = Partial<Record<VagaStatus, number>>

export interface VagaCountFilters {
  companyId?: string
  /** Busca parcial no título da vaga */
  search?: string
}

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/** URL do BFF que devolve só o total de vagas de um status. */
export function buildVagaCountUrl(
  status: VagaStatus,
  filters: VagaCountFilters,
  origin: string
): string {
  const url = new URL('/api/empregabilidade/vagas', origin)
  url.searchParams.set('page', '1')
  url.searchParams.set('page_size', '1')
  url.searchParams.set('status', status)

  const companyId = filters.companyId?.trim()
  if (companyId) {
    url.searchParams.set('company_id', companyId)
  }

  const search = filters.search?.trim()
  if (search) {
    url.searchParams.set('search', search)
  }

  return url.toString()
}

/** Lê `meta.total` da resposta do BFF; `null` quando ausente ou inválido. */
export function parseVagaTotal(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null
  const meta = (body as { meta?: unknown }).meta
  if (typeof meta !== 'object' || meta === null) return null
  const total = (meta as { total?: unknown }).total
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 0) {
    return null
  }
  return total
}

/**
 * Busca, em paralelo, o total de cada status. A falha de um status não
 * derruba os demais: ele só fica fora do resultado (sem contagem na aba).
 */
export async function fetchVagaCountsByStatus(
  statuses: readonly VagaStatus[],
  filters: VagaCountFilters,
  fetchFn: FetchLike,
  origin: string,
  signal?: AbortSignal
): Promise<VagaCounts> {
  const results = await Promise.all(
    statuses.map(async status => {
      try {
        const response = await fetchFn(
          buildVagaCountUrl(status, filters, origin),
          { signal }
        )
        if (!response.ok) return [status, null] as const
        return [status, parseVagaTotal(await response.json())] as const
      } catch {
        return [status, null] as const
      }
    })
  )

  const counts: VagaCounts = {}
  for (const [status, total] of results) {
    if (total !== null) {
      counts[status] = total
    }
  }
  return counts
}

/** Rótulo da aba com a contagem, ex.: "Vagas ativas (20)". */
export function formatTabLabelWithCount(
  label: string,
  count: number | undefined
): string {
  return count === undefined ? label : `${label} (${count})`
}
