'use client'

import { useCallback, useEffect, useState } from 'react'

// Type representing the opportunity data structure from API
export interface MEIOpportunity {
  id: number
  title: string
  activity_type: string
  activity_specification: string
  description: string
  outras_informacoes?: string
  address: string
  number: string
  neighborhood: string
  forma_pagamento?: string
  prazo_pagamento?: string
  opportunity_expiration_date: string
  service_execution_deadline?: string
  gallery_images?: string[]
  cover_image?: string
  status: 'active' | 'draft' | 'expired' | 'canceled' | 'closed'
  created_at: string
  updated_at: string
  orgao_id?: number
  orgao?: {
    id: number
    nome: string
  }
  cnae_id?: number
  cnae?: {
    id: number
    codigo: string
    ocupacao: string
    servico: string
  }
  execution_location?: string
}

interface UseMEIOpportunityReturn {
  opportunity: MEIOpportunity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Helper function to transform API data to component format
function transformAPIData(apiData: any): MEIOpportunity {
  return {
    id: apiData.id,
    title: apiData.titulo || '',
    activity_type: apiData.cnae?.ocupacao || '',
    activity_specification: apiData.cnae?.servico || '',
    description: apiData.descricao_servico || '',
    outras_informacoes: apiData.outras_informacoes || '',
    address: apiData.logradouro || '',
    number: apiData.numero || '',
    neighborhood: apiData.bairro || '',
    forma_pagamento: apiData.forma_pagamento || '',
    prazo_pagamento: apiData.prazo_pagamento || '',
    opportunity_expiration_date: apiData.data_expiracao || '',
    service_execution_deadline: apiData.data_limite_execucao || undefined,
    gallery_images: apiData.gallery_images || [],
    cover_image: apiData.cover_image || '',
    status: apiData.status || 'draft',
    created_at: apiData.created_at || '',
    updated_at: apiData.updated_at || '',
    orgao_id: apiData.orgao_id,
    orgao: apiData.orgao,
    cnae_id: apiData.cnae_id,
    cnae: apiData.cnae,
    execution_location: apiData.execution_location || '',
  }
}

export function useMEIOpportunity(
  opportunityId: string | null
): UseMEIOpportunityReturn {
  const [opportunity, setOpportunity] = useState<MEIOpportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOpportunity = useCallback(async () => {
    if (!opportunityId) {
      setLoading(false)
      setError(null)
      setOpportunity(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching opportunity from internal API:', opportunityId)

      // Call the Next.js API route instead of calling the external API directly
      const response = await fetch(`/api/oportunidades-mei/${opportunityId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Oportunidade não encontrada')
          setOpportunity(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch opportunity')
      }

      // Transform the API data to the expected format
      const transformedData = transformAPIData(data.opportunity)
      setOpportunity(transformedData)
    } catch (err) {
      console.error('Error fetching opportunity:', err)
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar oportunidade'
      )
      setOpportunity(null)
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  return {
    opportunity,
    loading,
    error,
    refetch: fetchOpportunity,
  }
}
