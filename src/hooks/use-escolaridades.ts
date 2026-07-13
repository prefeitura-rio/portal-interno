import type { EmpregabilidadeEscolaridade } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export interface UseEscolaridadesResult {
  escolaridades: EmpregabilidadeEscolaridade[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useEscolaridades(): UseEscolaridadesResult {
  const [escolaridades, setEscolaridades] = useState<
    EmpregabilidadeEscolaridade[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEscolaridades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/empregabilidade/escolaridades')
      if (!response.ok) {
        throw new Error(`Failed to fetch escolaridades: ${response.status}`)
      }
      const data = await response.json()
      const sorted = (data.data || []).sort(
        (a: EmpregabilidadeEscolaridade, b: EmpregabilidadeEscolaridade) =>
          (a.ordem ?? 0) - (b.ordem ?? 0)
      )
      setEscolaridades(sorted)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEscolaridades()
  }, [fetchEscolaridades])

  return { escolaridades, loading, error, refetch: fetchEscolaridades }
}
