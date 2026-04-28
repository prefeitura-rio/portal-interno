import type { EmpregabilidadeRegimeContratacao } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

/**
 * Hook to fetch Regimes de Contratação from backend
 *
 * Returns real UUID values from database to be used in vaga creation forms
 *
 * @example
 * const { regimes, loading, error, refetch } = useRegimesContratacao()
 *
 * // Transform to select options
 * const options = regimes.map(regime => ({
 *   value: regime.id,  // UUID
 *   label: regime.descricao
 * }))
 */
export interface UseRegimesContratacaoResult {
  regimes: EmpregabilidadeRegimeContratacao[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useRegimesContratacao(): UseRegimesContratacaoResult {
  const [regimes, setRegimes] = useState<EmpregabilidadeRegimeContratacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRegimes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[useRegimesContratacao] Fetching regimes de contratacao...')

      const response = await fetch('/api/empregabilidade/regimes-contratacao')

      if (!response.ok) {
        throw new Error(
          `Failed to fetch regimes de contratacao: ${response.status}`
        )
      }

      const data = await response.json()

      console.log(
        '[useRegimesContratacao] Success:',
        data.regimes?.length || 0,
        'regimes'
      )

      setRegimes(data.regimes || [])
    } catch (err) {
      console.error('[useRegimesContratacao] Error:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegimes()
  }, [fetchRegimes])

  return { regimes, loading, error, refetch: fetchRegimes }
}
