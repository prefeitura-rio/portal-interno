import type { Service } from '@/types/service'
import { useCallback, useEffect, useState } from 'react'

interface UseServiceReturn {
  service: Service | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useService(serviceId: string | null): UseServiceReturn {
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchService = useCallback(async () => {
    if (!serviceId) {
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/services/${serviceId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Service not found')
        }
        throw new Error('Failed to fetch service')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch service')
      }

      setService(data.service)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setService(null)
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  useEffect(() => {
    fetchService()
  }, [fetchService])

  return { service, loading, error, refetch: fetchService }
}
