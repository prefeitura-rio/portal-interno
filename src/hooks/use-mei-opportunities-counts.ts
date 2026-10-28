import {
  type MEIOpportunityCounts,
  MEI_COUNT_STATUSES,
  fetchMEIOpportunityCountsByStatus,
} from '@/lib/mei-opportunities-counts'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseMEIOpportunitiesCountsParams {
  /** Órgão (secretaria) selecionado no filtro da tabela */
  orgaoId?: number
  /** Busca parcial no título da oportunidade */
  titulo?: string
}

export interface UseMEIOpportunitiesCountsResult {
  counts: MEIOpportunityCounts
  loading: boolean
  refetch: () => void
}

/**
 * Total de oportunidades MEI de cada status (abas da listagem), com os
 * mesmos filtros de órgão e busca da tabela.
 */
export function useMEIOpportunitiesCounts(
  params: UseMEIOpportunitiesCountsParams = {}
): UseMEIOpportunitiesCountsResult {
  const { orgaoId, titulo } = params
  const [counts, setCounts] = useState<MEIOpportunityCounts>({})
  const [loading, setLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchCounts = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    const result = await fetchMEIOpportunityCountsByStatus(
      MEI_COUNT_STATUSES,
      { orgaoId, titulo },
      fetch,
      window.location.origin,
      controller.signal
    )

    // Ignora respostas de uma consulta substituída por outra mais nova
    if (controller.signal.aborted) return
    setCounts(result)
    setLoading(false)
  }, [orgaoId, titulo])

  useEffect(() => {
    fetchCounts()
    return () => controllerRef.current?.abort()
  }, [fetchCounts])

  return { counts, loading, refetch: fetchCounts }
}
