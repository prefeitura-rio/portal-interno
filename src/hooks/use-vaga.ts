'use client'

import type { EmpregabilidadeVaga } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

interface UseVagaReturn {
  vaga: EmpregabilidadeVaga | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook customizado para buscar uma vaga específica por ID
 *
 * @param id - ID da vaga (UUID)
 * @returns {UseVagaReturn} Objeto com vaga, loading, error e refetch
 *
 * @example
 * const { vaga, loading, error, refetch } = useVaga('uuid-da-vaga')
 */
export function useVaga(id: string | null): UseVagaReturn {
  const [vaga, setVaga] = useState<EmpregabilidadeVaga | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVaga = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[useVaga] Fetching vaga:', id)

      const response = await fetch(`/api/empregabilidade/vagas/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Vaga não encontrada')
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar vaga')
      }

      const data = await response.json()
      console.log('[useVaga] Vaga loaded successfully:', data.vaga?.id)
      setVaga(data.vaga)
    } catch (err) {
      console.error('[useVaga] Error:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setVaga(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchVaga()
  }, [fetchVaga])

  return {
    vaga,
    loading,
    error,
    refetch: fetchVaga,
  }
}
