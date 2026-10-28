import {
  VAGA_COUNT_STATUSES,
  type VagaCounts,
  fetchVagaCountsByStatus,
} from '@/lib/empregabilidade-vagas-counts'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseEmpregabilidadeVagasCountsParams {
  companyId?: string
  /** Busca parcial no título da vaga */
  search?: string
}

export interface UseEmpregabilidadeVagasCountsResult {
  counts: VagaCounts
  loading: boolean
  refetch: () => void
}

/**
 * Total de vagas de cada status (abas da listagem de empregabilidade),
 * com os mesmos filtros de empresa e busca da tabela.
 */
export function useEmpregabilidadeVagasCounts(
  params: UseEmpregabilidadeVagasCountsParams = {}
): UseEmpregabilidadeVagasCountsResult {
  const { companyId, search } = params
  const [counts, setCounts] = useState<VagaCounts>({})
  const [loading, setLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchCounts = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    const result = await fetchVagaCountsByStatus(
      VAGA_COUNT_STATUSES,
      { companyId, search },
      fetch,
      window.location.origin,
      controller.signal
    )

    // Ignora respostas de uma consulta substituída por outra mais nova
    if (controller.signal.aborted) return
    setCounts(result)
    setLoading(false)
  }, [companyId, search])

  useEffect(() => {
    fetchCounts()
    return () => controllerRef.current?.abort()
  }, [fetchCounts])

  return { counts, loading, refetch: fetchCounts }
}
