'use client'

import { useCallback, useEffect, useState } from 'react'

export type ProposalStatus = 'approved' | 'pending' | 'rejected'

export interface MEIProposal {
  id: string
  opportunityId: number
  companyName: string
  cnpj: string
  mei_empresa_id?: string
  amount: number
  submittedAt: string
  email: string
  phone?: string
  address?: string
  status: ProposalStatus
  aceita_custos_integrais?: boolean
  prazo_execucao?: string
  celular_pessoa_fisica?: string
  email_pessoa_fisica?: string
}

export interface MEIProposalSummary {
  approvedCount: number
  pendingCount: number
  rejectedCount: number
}

export interface ProposalFilters {
  status?: ProposalStatus
  search?: string
}

interface UseMEIProposalsOptions {
  opportunityId: number
  page?: number
  perPage?: number
  filters?: ProposalFilters
}

interface UseMEIProposalsReturn {
  proposals: MEIProposal[]
  summary: MEIProposalSummary | null
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateStatus: (
    proposalId: string,
    status: ProposalStatus
  ) => Promise<MEIProposal | null>
  updateMultipleStatuses: (
    proposalIds: string[],
    status: ProposalStatus
  ) => Promise<boolean>
}

export function useMEIProposals({
  opportunityId,
  page = 1,
  perPage = 10,
  filters,
}: UseMEIProposalsOptions): UseMEIProposalsReturn {
  const [proposals, setProposals] = useState<MEIProposal[]>([])
  const [summary, setSummary] = useState<MEIProposalSummary | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    if (!opportunityId) return

    try {
      setLoading(true)
      setError(null)

      // Build query params - filters ARE sent to API
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      })

      if (filters?.status) {
        params.append('status', filters.status)
      }

      if (filters?.search) {
        params.append('search', filters.search)
      }

      const response = await fetch(
        `/api/oportunidades-mei/${opportunityId}/propostas?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Erro ao carregar propostas')
      }

      const data = await response.json()

      // Map API response to our interface
      setProposals(data.proposals || [])
      setSummary(data.summary || null)
      setPagination({
        page: data.pagination?.page || page,
        perPage: data.pagination?.perPage || perPage,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar propostas'
      )
      console.error('Error fetching proposals:', err)
    } finally {
      setLoading(false)
    }
  }, [opportunityId, page, perPage, filters?.status, filters?.search])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const refetch = async () => {
    await fetchProposals()
  }

  const updateStatus = async (
    proposalId: string,
    status: ProposalStatus
  ): Promise<MEIProposal | null> => {
    try {
      const response = await fetch(
        `/api/oportunidades-mei/${opportunityId}/propostas/${proposalId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao atualizar status da proposta')
      }

      const data = await response.json()
      await refetch()
      return data.proposal || null
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar proposta'
      )
      console.error('Error updating proposal status:', err)
      return null
    }
  }

  const updateMultipleStatuses = async (
    proposalIds: string[],
    status: ProposalStatus
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/oportunidades-mei/${opportunityId}/propostas/bulk-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ proposalIds, status }),
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao atualizar status das propostas')
      }

      const data = await response.json()
      await refetch()
      return data.success || false
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar propostas'
      )
      console.error('Error updating multiple proposal statuses:', err)
      return false
    }
  }

  return {
    proposals,
    summary,
    pagination,
    loading,
    error,
    refetch,
    updateStatus,
    updateMultipleStatuses,
  }
}
