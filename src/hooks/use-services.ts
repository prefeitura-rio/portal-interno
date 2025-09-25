import type { ServiceListItem, ServiceStatus } from '@/types/service'
import { useCallback, useEffect, useState } from 'react'

interface UseServicesParams {
  page?: number
  perPage?: number
  search?: string
  status?: ServiceStatus
  managingOrgan?: string
}

interface UseServicesReturn {
  services: ServiceListItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  } | null
  refetch: () => Promise<void>
}

interface ServicesApiResponse {
  data: ServiceListItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
  success: boolean
}

export function useServices(params: UseServicesParams = {}): UseServicesReturn {
  const [services, setServices] = useState<ServiceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    per_page: number
    total: number
    total_pages: number
  } | null>(null)

  const fetchServices = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters for internal API route
      const searchParams = new URLSearchParams()

      if (params.page) {
        searchParams.append('page', params.page.toString())
      }

      if (params.perPage) {
        searchParams.append('per_page', params.perPage.toString())
      }

      if (params.search?.trim()) {
        searchParams.append('search', params.search.trim())
      }

      if (params.status) {
        searchParams.append('status', params.status)
      }

      if (params.managingOrgan?.trim()) {
        searchParams.append('managing_organ', params.managingOrgan.trim())
      }

      // Add cache-busting parameter for force refresh
      if (forceRefresh) {
        searchParams.append('_t', Date.now().toString())
      }

      const url = `/api/services?${searchParams.toString()}`

      console.log('Fetching services from internal API:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Disable caching for force refresh
        ...(forceRefresh && { cache: 'no-store' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ServicesApiResponse = await response.json()

      if (!data.success) {
        throw new Error('API returned error')
      }

      setServices(data.data)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching services:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setServices([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [
    params.page,
    params.perPage,
    params.search,
    params.status,
    params.managingOrgan,
  ])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const refetch = useCallback(async () => {
    await fetchServices(true) // Force refresh with cache busting
  }, [fetchServices])

  return {
    services,
    loading,
    error,
    pagination,
    refetch,
  }
}
