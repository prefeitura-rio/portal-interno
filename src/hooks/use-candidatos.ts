import { useCallback, useEffect, useState } from 'react'

export type CandidatoStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Candidato {
  id: string
  candidateName: string
  cpf: string
  email: string
  phone?: string
  enrollmentDate: string
  status: CandidatoStatus
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  customFields?: Array<{
    id: string
    title: string
    field_type: string
    value: string
    options?: Array<{
      id: string
      value: string
    }>
  }>
}

export interface CandidatoSummary {
  total: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  cancelledCount: number
}

export interface CandidatoFilters {
  status?: CandidatoStatus[]
  search?: string
}

interface UseCandidatosOptions {
  empregabilidadeId: string
  page?: number
  perPage?: number
  filters?: CandidatoFilters
  autoFetch?: boolean
}

interface UseCandidatosReturn {
  candidatos: Candidato[]
  summary: CandidatoSummary | null
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCandidatoStatus: (
    candidatoId: string,
    status: CandidatoStatus
  ) => Promise<Candidato | null>
  updateMultipleCandidatoStatuses: (
    candidatoIds: string[],
    status: CandidatoStatus
  ) => Promise<boolean>
}

export function useCandidatos({
  empregabilidadeId,
  page = 1,
  perPage = 10,
  filters,
  autoFetch = true,
}: UseCandidatosOptions): UseCandidatosReturn {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [summary, setSummary] = useState<CandidatoSummary | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidatos = useCallback(async () => {
    if (!empregabilidadeId) return

    setLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        id_vaga: empregabilidadeId,
      })

      // Add status filter if present (single status only for now)
      if (filters?.status && filters.status.length === 1) {
        params.append('status', filters.status[0])
      }

      // Add search filter if present
      if (filters?.search) {
        params.append('search', filters.search)
      }

      console.log('Fetching candidatos with params:', params.toString())

      const response = await fetch(
        `/api/empregabilidade/candidaturas?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to fetch candidatos: ${response.statusText}`
        )
      }

      const data = await response.json()

      console.log('Received candidatos:', data)

      setCandidatos(data.candidatos || [])
      setSummary(data.summary || null)
      setPagination(data.pagination || null)
    } catch (err) {
      console.error('Error fetching candidatos:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch candidatos'
      )
      setCandidatos([])
      setSummary(null)
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [empregabilidadeId, page, perPage, filters])

  useEffect(() => {
    if (autoFetch) {
      fetchCandidatos()
    }
  }, [fetchCandidatos, autoFetch])

  const updateCandidatoStatus = useCallback(
    async (
      candidatoId: string,
      status: CandidatoStatus
    ): Promise<Candidato | null> => {
      try {
        let endpoint = ''

        // Map to specific endpoints
        if (status === 'approved') {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/approve`
        } else if (status === 'rejected') {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/reject`
        } else {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/status`
        }

        console.log('Updating candidato status:', { candidatoId, status, endpoint })

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: status !== 'approved' && status !== 'rejected'
            ? JSON.stringify({ status })
            : undefined,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update candidato status')
        }

        // Refetch to get updated data
        await fetchCandidatos()

        const data = await response.json()
        return data.candidatura || null
      } catch (err) {
        console.error('Error updating candidato status:', err)
        throw err
      }
    },
    [fetchCandidatos]
  )

  const updateMultipleCandidatoStatuses = useCallback(
    async (
      candidatoIds: string[],
      status: CandidatoStatus
    ): Promise<boolean> => {
      try {
        console.log('Updating multiple candidatos:', { count: candidatoIds.length, status })

        // Execute all updates in parallel
        const promises = candidatoIds.map(id => updateCandidatoStatus(id, status))
        await Promise.all(promises)

        // Refetch to get updated data
        await fetchCandidatos()
        return true
      } catch (err) {
        console.error('Error updating multiple candidato statuses:', err)
        return false
      }
    },
    [updateCandidatoStatus, fetchCandidatos]
  )

  return {
    candidatos,
    summary,
    pagination,
    loading,
    error,
    refetch: fetchCandidatos,
    updateCandidatoStatus,
    updateMultipleCandidatoStatuses,
  }
}
