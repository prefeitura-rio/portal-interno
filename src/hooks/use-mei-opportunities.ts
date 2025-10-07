import type { ModelsOportunidadeMEI } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export type MEIOpportunityStatus = 'active' | 'expired' | 'draft'

export interface UseMEIOpportunitiesParams {
  page?: number
  pageSize?: number
  status?: MEIOpportunityStatus
  orgaoId?: number
  titulo?: string
}

export interface UseMEIOpportunitiesResult {
  opportunities: ModelsOportunidadeMEI[]
  loading: boolean
  error: Error | null
  total: number
  pageCount: number
  refetch: () => void
}

export function useMEIOpportunities(
  params: UseMEIOpportunitiesParams = {}
): UseMEIOpportunitiesResult {
  const [opportunities, setOpportunities] = useState<ModelsOportunidadeMEI[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  const { page = 1, pageSize = 10, status = 'active', orgaoId, titulo } = params

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build URL with query parameters
      const url = new URL('/api/oportunidades-mei', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('page_size', pageSize.toString())
      url.searchParams.set('status', status)

      if (orgaoId) {
        url.searchParams.set('orgao_id', orgaoId.toString())
      }

      if (titulo?.trim()) {
        url.searchParams.set('titulo', titulo.trim())
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch MEI opportunities')
      }

      const data = await response.json()

      setOpportunities(data.data || [])
      setTotal(data.meta?.total || 0)
      setPageCount(Math.ceil((data.meta?.total || 0) / pageSize))
    } catch (err) {
      console.error('Error fetching MEI opportunities:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, orgaoId, titulo])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  return {
    opportunities,
    loading,
    error,
    total,
    pageCount,
    refetch: fetchOpportunities,
  }
}
