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
      // If multiple statuses are selected, fetch each separately
      if (filters?.status && filters.status.length > 1) {
        const promises = filters.status.map(async status => {
          const params = new URLSearchParams({
            page: '1',
            perPage: '1000',
          })

          params.append('status', status)

          if (filters?.search) {
            params.append('search', filters.search)
          }

          const response = await fetch(
            `/api/empregos/${empregabilidadeId}/candidatos?${params.toString()}`
          )

          if (!response.ok) {
            throw new Error(
              `Failed to fetch candidatos: ${response.statusText}`
            )
          }

          return response.json()
        })

        const results = await Promise.all(promises)

        // Combine all candidatos from different statuses
        const allCandidatos = results.flatMap(
          (result: any) => result.candidatos || []
        )

        // Remove duplicates by id
        const uniqueCandidatos = Array.from(
          new Map(allCandidatos.map((c: Candidato) => [c.id, c])).values()
        )

        // Client-side pagination
        const startIndex = (page - 1) * perPage
        const endIndex = startIndex + perPage
        const paginatedCandidatos = uniqueCandidatos.slice(
          startIndex,
          endIndex
        )

        setCandidatos(paginatedCandidatos)
        setSummary(results[0]?.summary || null)
        setPagination({
          page,
          perPage,
          total: uniqueCandidatos.length,
          totalPages: Math.ceil(uniqueCandidatos.length / perPage),
        })
      } else {
        // Single status or no status filter
        const params = new URLSearchParams({
          page: page.toString(),
          perPage: perPage.toString(),
        })

        if (filters?.status && filters.status.length === 1) {
          params.append('status', filters.status[0])
        }

        if (filters?.search) {
          params.append('search', filters.search)
        }

        const response = await fetch(
          `/api/empregos/${empregabilidadeId}/candidatos?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(
            `Failed to fetch candidatos: ${response.statusText}`
          )
        }

        const data = await response.json()

        setCandidatos(data.candidatos || [])
        setSummary(data.summary || null)
        setPagination(data.pagination || null)
      }
    } catch (err) {
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
        // TODO: Implement API call when endpoint is available
        // For now, update locally
        setCandidatos(prev =>
          prev.map(c =>
            c.id === candidatoId ? { ...c, status } : c
          )
        )

        // Refetch to get updated data
        await fetchCandidatos()
        return null
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
        // TODO: Implement bulk API call when endpoint is available
        // For now, update locally
        setCandidatos(prev =>
          prev.map(c =>
            candidatoIds.includes(c.id) ? { ...c, status } : c
          )
        )

        // Refetch to get updated data
        await fetchCandidatos()
        return true
      } catch (err) {
        console.error('Error updating multiple candidato statuses:', err)
        return false
      }
    },
    [fetchCandidatos]
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
