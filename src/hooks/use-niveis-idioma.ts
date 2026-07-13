import type { EmpregabilidadeNivelIdioma } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export interface UseNiveisIdiomaResult {
  niveisIdioma: EmpregabilidadeNivelIdioma[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useNiveisIdioma(): UseNiveisIdiomaResult {
  const [niveisIdioma, setNiveisIdioma] = useState<
    EmpregabilidadeNivelIdioma[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchNiveis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/empregabilidade/niveis-idioma')
      if (!response.ok) {
        throw new Error(`Failed to fetch níveis de idioma: ${response.status}`)
      }
      const data = await response.json()
      const sorted = (data.data || []).sort(
        (a: EmpregabilidadeNivelIdioma, b: EmpregabilidadeNivelIdioma) =>
          (a.ordem ?? 0) - (b.ordem ?? 0)
      )
      setNiveisIdioma(sorted)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNiveis()
  }, [fetchNiveis])

  return { niveisIdioma, loading, error, refetch: fetchNiveis }
}
