import {
  TOMBAMENTOS_PAGE_SIZE,
  listAllTombamentos,
} from '@/lib/tombamento-duplicates'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

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
    found?: number
    out_of?: number
    page?: number
  }
  success: boolean
}

export type CreateTombamentoResult =
  | { ok: true; tombamento: Tombamento }
  | { ok: false; status: number | null; error: string }

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

  const fetchAllTombamentos = useCallback(async (): Promise<
    Tombamento[] | null
  > => {
    try {
      setLoading(true)
      setError(null)

      return await listAllTombamentos<Tombamento>(async (page, perPage) => {
        const searchParams = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
        })
        const response = await fetch(`/api/tombamentos?${searchParams}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch tombamentos')
        }

        return (data as TombamentosResponse).data ?? {}
      }, TOMBAMENTOS_PAGE_SIZE)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching all tombamentos:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createTombamento = useCallback(
    async (
      tombamentoData: TombamentoRequest
    ): Promise<CreateTombamentoResult> => {
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
          const errorMessage =
            typeof data?.error === 'string' && data.error
              ? data.error
              : 'Failed to create tombamento'
          setError(errorMessage)
          console.error('Error creating tombamento:', errorMessage)
          return { ok: false, status: response.status, error: errorMessage }
        }

        return { ok: true, tombamento: data.tombamento }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error creating tombamento:', err)
        return { ok: false, status: null, error: errorMessage }
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

        await requestTombamentoDeletion(tombamentoId)

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

  /**
   * Remove todos os tombamentos de um serviço (DEV-147: serviço com registros
   * duplicados, criados antes da checagem do BFF). Devolve os ids removidos;
   * os que falharem continuam no backend e aparecem na próxima leitura.
   */
  const deleteTombamentos = useCallback(
    async (tombamentoIds: readonly string[]): Promise<string[]> => {
      setLoading(true)
      setError(null)

      const removed: string[] = []
      let lastError: string | null = null
      try {
        for (const tombamentoId of tombamentoIds) {
          try {
            await requestTombamentoDeletion(tombamentoId)
            removed.push(tombamentoId)
          } catch (err) {
            lastError = err instanceof Error ? err.message : 'Unknown error'
            console.error('Error deleting tombamento:', err)
          }
        }
      } finally {
        setLoading(false)
      }

      if (lastError) {
        setError(lastError)
        toast.error(
          removed.length > 0
            ? `${removed.length} de ${tombamentoIds.length} tombamentos removidos. Tente novamente para remover os restantes.`
            : 'Erro ao remover tombamento. Tente novamente.'
        )
      } else if (removed.length > 0) {
        toast.success(
          removed.length > 1
            ? `${removed.length} tombamentos removidos com sucesso!`
            : 'Tombamento removido com sucesso!'
        )
      }

      return removed
    },
    []
  )

  return {
    loading,
    error,
    fetchTombamentos,
    fetchAllTombamentos,
    fetchTombamentoByOldService,
    createTombamento,
    deleteTombamento,
    deleteTombamentos,
  }
}

async function requestTombamentoDeletion(tombamentoId: string): Promise<void> {
  const response = await fetch(
    `/api/tombamentos/${encodeURIComponent(tombamentoId)}`,
    { method: 'DELETE' }
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete tombamento')
  }
}
