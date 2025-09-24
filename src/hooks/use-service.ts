import { fetchServiceById } from '@/lib/api-service-adapter'
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

      // Simulate API delay only in mock mode
      await new Promise(resolve => setTimeout(resolve, 300))

      const foundService = await fetchServiceById(serviceId)
      setService(foundService)
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
