import type { EmpregabilidadeTipoPCD } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export interface UseTiposPcdResult {
  tiposPcd: EmpregabilidadeTipoPCD[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch Tipos de PCD from backend for vaga forms
 */
export function useTiposPcd(): UseTiposPcdResult {
  const [tiposPcd, setTiposPcd] = useState<EmpregabilidadeTipoPCD[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTiposPcd = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/empregabilidade/tipos-pcd')
      if (!response.ok) {
        throw new Error(`Failed to fetch tipos PCD: ${response.status}`)
      }
      const data = await response.json()
      setTiposPcd(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTiposPcd()
  }, [fetchTiposPcd])

  return { tiposPcd, loading, error, refetch: fetchTiposPcd }
}
