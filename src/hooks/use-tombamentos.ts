import { useCallback, useState } from 'react'
import { toast } from 'sonner'

// Get environment variables for tombamento origins
const getTombamentoOrigins = () => {
  const origem1746 = process.env.NEXT_PUBLIC_BUSCA_1746_COLLECTION
  const origemCarioca = process.env.NEXT_PUBLIC_BUSCA_CARIOCA_DIGITAL_COLLECTION

  if (!origem1746 || !origemCarioca) {
    console.warn(
      'Environment variables for tombamento origins not found, using fallback values'
    )
    return ['1746_v2_llm', 'carioca-digital_v2_llm']
  }

  return [origem1746, origemCarioca]
}

const tombamentoOrigins = getTombamentoOrigins()

export interface Tombamento {
  id: string
  origem: string
  id_servico_antigo: string
  id_servico_novo: string
  criado_em: number
  criado_por: string
  observacoes?: string
}

export interface TombamentoRequest {
  origem: string
  id_servico_antigo: string
  id_servico_novo: string
  observacoes?: string
}

export interface TombamentosResponse {
  data: {
    tombamentos: Tombamento[]
    total: number
    page: number
    per_page: number
  }
  success: boolean
}

export interface TombamentoByOldServiceResponse {
  tombamento: Tombamento
  success: boolean
}

export function useTombamentos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTombamentos = useCallback(
    async (params?: {
      page?: number
      per_page?: number
      origem?: string
      criado_por?: string
    }): Promise<TombamentosResponse | null> => {
      try {
        setLoading(true)
        setError(null)

        const searchParams = new URLSearchParams()
        if (params?.page) searchParams.set('page', params.page.toString())
        if (params?.per_page)
          searchParams.set('per_page', params.per_page.toString())
        if (params?.origem) searchParams.set('origem', params.origem)
        if (params?.criado_por)
          searchParams.set('criado_por', params.criado_por)

        const url = `/api/tombamentos${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

        const response = await fetch(url)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch tombamentos')
        }

        return data
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching tombamentos:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchTombamentoByOldService = useCallback(
    async (params: {
      origem: string
      id_servico_antigo: string
    }): Promise<TombamentoByOldServiceResponse | null> => {
      try {
        setLoading(true)
        setError(null)

        const searchParams = new URLSearchParams()
        searchParams.set('origem', params.origem)
        searchParams.set('id_servico_antigo', params.id_servico_antigo)

        const url = `/api/tombamentos/by-old-service?${searchParams.toString()}`

        const response = await fetch(url)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            return null // Tombamento not found
          }
          throw new Error(data.error || 'Failed to fetch tombamento')
        }

        return data
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching tombamento by old service:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createTombamento = useCallback(
    async (tombamentoData: TombamentoRequest): Promise<Tombamento | null> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/tombamentos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tombamentoData),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create tombamento')
        }

        return data.tombamento
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error creating tombamento:', err)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteTombamento = useCallback(
    async (tombamentoId: string): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/tombamentos/${tombamentoId}`, {
          method: 'DELETE',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete tombamento')
        }

        toast.success('Tombamento removido com sucesso!')
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error deleting tombamento:', err)
        toast.error('Erro ao remover tombamento. Tente novamente.')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    fetchTombamentos,
    fetchTombamentoByOldService,
    createTombamento,
    deleteTombamento,
  }
}
