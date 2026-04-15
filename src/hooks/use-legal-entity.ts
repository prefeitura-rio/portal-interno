'use client'

import type { ModelsLegalEntity } from '@/http-rmi/models/modelsLegalEntity'
import { useCallback, useState } from 'react'

interface UseLegalEntityReturn {
  legalEntity: ModelsLegalEntity | null
  loading: boolean
  error: string | null
  fetchLegalEntity: (cnpj: string) => Promise<void>
}

export function useLegalEntity(): UseLegalEntityReturn {
  const [legalEntity, setLegalEntity] = useState<ModelsLegalEntity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLegalEntity = useCallback(async (cnpj: string) => {
    if (!cnpj) {
      setError('CNPJ is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/legal-entity/${cnpj}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados da entidade jurídica')
      }

      const data = await response.json()

      if (data.success && data.data) {
        setLegalEntity(data.data)
      } else {
        setError('Dados da entidade jurídica não encontrados')
        setLegalEntity(null)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao buscar entidade jurídica'
      )
      console.error('Error fetching legal entity:', err)
      setLegalEntity(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    legalEntity,
    loading,
    error,
    fetchLegalEntity,
  }
}
