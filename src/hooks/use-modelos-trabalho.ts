import type { EmpregabilidadeModeloTrabalho } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

/**
 * Hook to fetch Modelos de Trabalho from backend
 *
 * Returns real UUID values from database to be used in vaga creation forms
 *
 * NOTE: This uses a workaround approach because the backend endpoint
 * /modelos-trabalho exists and works, but lacks Swagger documentation.
 * The API route uses customFetchGoRio directly instead of an Orval client.
 *
 * @example
 * const { modelos, loading, error, refetch } = useModelosTrabalho()
 *
 * // Transform to select options
 * const options = modelos.map(modelo => ({
 *   value: modelo.id,  // UUID
 *   label: modelo.descricao
 * }))
 */
export interface UseModelosTrabalhoResult {
  modelos: EmpregabilidadeModeloTrabalho[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useModelosTrabalho(): UseModelosTrabalhoResult {
  const [modelos, setModelos] = useState<EmpregabilidadeModeloTrabalho[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchModelos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[useModelosTrabalho] Fetching modelos de trabalho...')

      const response = await fetch('/api/empregabilidade/modelos-trabalho')

      if (!response.ok) {
        throw new Error(
          `Failed to fetch modelos de trabalho: ${response.status}`
        )
      }

      const data = await response.json()

      console.log(
        '[useModelosTrabalho] Success:',
        data.modelos?.length || 0,
        'modelos'
      )

      setModelos(data.modelos || [])
    } catch (err) {
      console.error('[useModelosTrabalho] Error:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModelos()
  }, [fetchModelos])

  return { modelos, loading, error, refetch: fetchModelos }
}
