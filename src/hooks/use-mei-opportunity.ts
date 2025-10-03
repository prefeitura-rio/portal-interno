'use client'

import { useEffect, useState } from 'react'
import { MEIOpportunity, getMEIOpportunityById } from '@/lib/mock-mei-opportunities'

export type { MEIOpportunity }

interface UseMEIOpportunityReturn {
  opportunity: MEIOpportunity | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMEIOpportunity(opportunityId: string | null): UseMEIOpportunityReturn {
  const [opportunity, setOpportunity] = useState<MEIOpportunity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOpportunity = async () => {
    if (!opportunityId) return

    try {
      setLoading(true)
      setError(null)

      // Use unified mock data
      const mockOpportunity = getMEIOpportunityById(opportunityId)

      if (!mockOpportunity) {
        setError('Oportunidade não encontrada')
        return
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOpportunity(mockOpportunity)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar oportunidade')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunity()
  }, [opportunityId])

  const refetch = () => {
    fetchOpportunity()
  }

  return {
    opportunity,
    loading,
    error,
    refetch
  }
}
