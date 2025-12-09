import type { ModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface UseServiceOperationsReturn {
  createService: (
    data: ModelsPrefRioServiceRequest & {
      is_free?: boolean
    }
  ) => Promise<any>
  updateService: (
    id: string,
    data: ModelsPrefRioServiceRequest & {
      is_free?: boolean
    }
  ) => Promise<any>
  publishService: (id: string) => Promise<any>
  unpublishService: (id: string) => Promise<any>
  sendToApproval: (id: string) => Promise<any>
  sendToEdition: (id: string) => Promise<any>
  deleteService: (id: string) => Promise<any>
  getService: (id: string) => Promise<any>
  loading: boolean
  error: string | null
}

export function useServiceOperations(): UseServiceOperationsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createService = useCallback(
    async (
      data: ModelsPrefRioServiceRequest & {
        is_free?: boolean
      }
    ) => {
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
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao criar serviço'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateService = useCallback(
    async (
      id: string,
      data: ModelsPrefRioServiceRequest & {
        is_free?: boolean
      }
    ) => {
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
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao atualizar serviço'
        setError(errorMessage)
        toast.error(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const publishService = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('📤 Publishing service:', id)

      const response = await fetch(`/api/services/${id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao publicar serviço')
      }

      console.log('✅ Service published successfully:', result.service?.id)
      toast.success('Serviço publicado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao publicar serviço'
      console.error('❌ Error publishing service:', err)
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

      console.log('📤 Unpublishing service:', id)

      const response = await fetch(`/api/services/${id}/unpublish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao despublicar serviço')
      }

      console.log('✅ Service unpublished successfully:', result.service?.id)
      toast.success('Serviço despublicado com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao despublicar serviço'
      console.error('❌ Error unpublishing service:', err)
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendToApproval = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('📤 Sending service to approval:', id)

      const response = await fetch(`/api/services/${id}/send-to-approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(
          result.error || 'Falha ao enviar serviço para aprovação'
        )
      }

      console.log(
        '✅ Service sent to approval successfully:',
        result.service?.id
      )
      toast.success('Serviço enviado para aprovação com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erro ao enviar serviço para aprovação'
      console.error('❌ Error sending service to approval:', err)
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendToEdition = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log('📤 Sending service to edition:', id)

      const response = await fetch(`/api/services/${id}/send-to-edition`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar serviço para edição')
      }

      console.log(
        '✅ Service sent to edition successfully:',
        result.service?.id
      )
      toast.success('Serviço enviado para edição com sucesso!')
      return result.service
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Erro ao enviar serviço para edição'
      console.error('❌ Error sending service to edition:', err)
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
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao excluir serviço'
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
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao buscar serviço'
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
    sendToApproval,
    sendToEdition,
    deleteService,
    getService,
    loading,
    error,
  }
}
