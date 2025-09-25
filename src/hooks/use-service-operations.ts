import type { ModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface UseServiceOperationsReturn {
  createService: (data: ModelsPrefRioServiceRequest) => Promise<any>
  updateService: (id: string, data: ModelsPrefRioServiceRequest) => Promise<any>
  publishService: (id: string) => Promise<any>
  unpublishService: (id: string) => Promise<any>
  deleteService: (id: string) => Promise<any>
  getService: (id: string) => Promise<any>
  loading: boolean
  error: string | null
}

export function useServiceOperations(): UseServiceOperationsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createService = useCallback(async (data: ModelsPrefRioServiceRequest) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Creating service with data:', data)

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar serviço')
      }

      toast.success('Serviço criado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar serviço'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateService = useCallback(async (id: string, data: ModelsPrefRioServiceRequest) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Updating service:', id, 'with data:', data)

      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar serviço')
      }

      toast.success('Serviço atualizado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar serviço'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const publishService = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Publishing service:', id)

      const response = await fetch(`/api/services/${id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao publicar serviço')
      }

      toast.success('Serviço publicado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao publicar serviço'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const unpublishService = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Unpublishing service:', id)

      const response = await fetch(`/api/services/${id}/unpublish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao despublicar serviço')
      }

      toast.success('Serviço despublicado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao despublicar serviço'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteService = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Deleting service:', id)

      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao excluir serviço')
      }

      toast.success('Serviço excluído com sucesso!')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir serviço'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getService = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Fetching service:', id)

      const response = await fetch(`/api/services/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar serviço')
      }

      return result.service
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar serviço'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createService,
    updateService,
    publishService,
    unpublishService,
    deleteService,
    getService,
    loading,
    error,
  }
}