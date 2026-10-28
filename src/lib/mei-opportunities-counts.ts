import type { MEIOpportunityStatus } from '@/hooks/use-mei-opportunities'

/**
 * Contagem de oportunidades MEI por status para as abas da listagem
 * (DEV-59, mesmo padrão das vagas em DEV-29). Cada contagem vem do
 * `meta.total` do BFF `/api/oportunidades-mei`, consultado com
 * `page_size=1`: é o total real do status no backend, não a quantidade de
 * itens da página exibida.
 */

export const MEI_COUNT_STATUSES: readonly MEIOpportunityStatus[] = [
  'active',
  'expired',
  'draft',
]

/** Total por status; status ausente = contagem indisponível. */
export type MEIOpportunityCounts = Partial<Record<MEIOpportunityStatus, number>>

export interface MEIOpportunityCountFilters {
  /** Órgão (secretaria) selecionado no filtro da tabela */
  orgaoId?: number
  /** Busca parcial no título da oportunidade */
  titulo?: string
}

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/** URL do BFF que devolve só o total de oportunidades de um status. */
export function buildMEIOpportunityCountUrl(
  status: MEIOpportunityStatus,
  filters: MEIOpportunityCountFilters,
  origin: string
): string {
  const url = new URL('/api/oportunidades-mei', origin)
  url.searchParams.set('page', '1')
  url.searchParams.set('page_size', '1')
  url.searchParams.set('status', status)

  const { orgaoId } = filters
  if (orgaoId !== undefined && Number.isInteger(orgaoId) && orgaoId > 0) {
    url.searchParams.set('orgao_id', orgaoId.toString())
  }

  const titulo = filters.titulo?.trim()
  if (titulo) {
    url.searchParams.set('titulo', titulo)
  }

  return url.toString()
}

/** Lê `meta.total` da resposta do BFF; `null` quando ausente ou inválido. */
export function parseMEIOpportunityTotal(body: unknown): number | null {
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
export async function fetchMEIOpportunityCountsByStatus(
  statuses: readonly MEIOpportunityStatus[],
  filters: MEIOpportunityCountFilters,
  fetchFn: FetchLike,
  origin: string,
  signal?: AbortSignal
): Promise<MEIOpportunityCounts> {
  const results = await Promise.all(
    statuses.map(async status => {
      try {
        const response = await fetchFn(
          buildMEIOpportunityCountUrl(status, filters, origin),
          { signal }
        )
        if (!response.ok) return [status, null] as const
        return [
          status,
          parseMEIOpportunityTotal(await response.json()),
        ] as const
      } catch {
        return [status, null] as const
      }
    })
  )

  const counts: MEIOpportunityCounts = {}
  for (const [status, total] of results) {
    if (total !== null) {
      counts[status] = total
    }
  }
  return counts
}
