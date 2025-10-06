'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MEIProposal, MEIProposalSummary, ProposalStatus } from '@/lib/mock-mei-proposals'
import { getProposalsByOpportunityId, updateMultipleProposalStatuses, updateProposalStatus } from '@/lib/mock-mei-proposals'

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
  pagination: { page: number; perPage: number; total: number; totalPages: number } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateStatus: (proposalId: string, status: ProposalStatus) => Promise<MEIProposal | null>
  updateMultipleStatuses: (proposalIds: string[], status: ProposalStatus) => Promise<boolean>
}

export function useMEIProposals({ opportunityId, page = 1, perPage = 10, filters }: UseMEIProposalsOptions): UseMEIProposalsReturn {
  const [proposals, setProposals] = useState<MEIProposal[]>([])
  const [summary, setSummary] = useState<MEIProposalSummary | null>(null)
  const [pagination, setPagination] = useState<{ page: number; perPage: number; total: number; totalPages: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    if (!opportunityId) return
    try {
      setLoading(true)
      setError(null)

      const { proposals, total, summary } = getProposalsByOpportunityId(opportunityId, {
        page,
        perPage,
        status: filters?.status,
        search: filters?.search,
      })

      setProposals(proposals)
      setSummary(summary)
      setPagination({ page, perPage, total, totalPages: Math.ceil(total / perPage) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar propostas')
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

  const updateStatus = async (proposalId: string, status: ProposalStatus) => {
    try {
      const updated = updateProposalStatus(proposalId, status)
      if (updated) {
        await refetch()
        return updated
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar proposta')
      return null
    }
  }

  const updateMultipleStatuses = async (proposalIds: string[], status: ProposalStatus) => {
    try {
      const success = updateMultipleProposalStatuses(proposalIds, status)
      if (success) {
        await refetch()
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar propostas')
      return false
    }
  }

  return { proposals, summary, pagination, loading, error, refetch, updateStatus, updateMultipleStatuses }
}

export type { MEIProposal, ProposalStatus }





