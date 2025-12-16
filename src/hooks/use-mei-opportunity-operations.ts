'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { BackendMEIOpportunityData } from './use-create-mei-opportunity'

interface UseMEIOpportunityOperationsReturn {
  updateOpportunity: (
    id: string,
    data: BackendMEIOpportunityData
  ) => Promise<any>
  publishOpportunity: (id: string) => Promise<any>
  deleteOpportunity: (id: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

export function useMEIOpportunityOperations(): UseMEIOpportunityOperationsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateOpportunity = useCallback(
    async (id: string, data: BackendMEIOpportunityData) => {
      try {
        setLoading(true)
        setError(null)

        console.log('Updating MEI opportunity:', id, 'with data:', data)

        const response = await fetch(`/api/oportunidades-mei/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          )
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Falha ao atualizar oportunidade')
        }

        toast.success('Oportunidade atualizada com sucesso!')
        return result.opportunity
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao atualizar oportunidade'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const publishOpportunity = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Publishing MEI opportunity:', id)

      const response = await fetch(`/api/oportunidades-mei/${id}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao publicar oportunidade')
      }

      toast.success('Oportunidade publicada com sucesso!')
      return result.opportunity
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao publicar oportunidade'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteOpportunity = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Deleting MEI opportunity:', id)

      const response = await fetch(`/api/oportunidades-mei/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao excluir oportunidade')
      }

      toast.success('Oportunidade excluída com sucesso!')
      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao excluir oportunidade'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updateOpportunity,
    publishOpportunity,
    deleteOpportunity,
    loading,
    error,
  }
}
