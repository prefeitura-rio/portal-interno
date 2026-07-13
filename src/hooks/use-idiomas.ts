import type { EmpregabilidadeIdioma } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export interface UseIdiomasResult {
  idiomas: EmpregabilidadeIdioma[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useIdiomas(): UseIdiomasResult {
  const [idiomas, setIdiomas] = useState<EmpregabilidadeIdioma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchIdiomas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/empregabilidade/idiomas')
      if (!response.ok) {
        throw new Error(`Failed to fetch idiomas: ${response.status}`)
      }
      const data = await response.json()
      setIdiomas(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIdiomas()
  }, [fetchIdiomas])

  return { idiomas, loading, error, refetch: fetchIdiomas }
}
