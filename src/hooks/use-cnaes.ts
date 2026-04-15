import { useEffect, useState } from 'react'
import type { ModelsCNAE } from '@/http-rmi/models/modelsCNAE'

interface CNAE {
  id: number
  codigo: string
  ocupacao: string
  servico: string
}

interface CNAEsResponse {
  data: CNAE[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}

interface UseCNAEsOptions {
  page?: number
  pageSize?: number
  ocupacao?: string
  enabled?: boolean
}

export function useCNAEs(options?: UseCNAEsOptions) {
  const { page = 1, pageSize = 100, ocupacao, enabled = true } = options || {}
  const [data, setData] = useState<CNAEsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        })

        if (ocupacao) {
          params.append('ocupacao', ocupacao)
        }

        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch CNAEs')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [page, pageSize, ocupacao, enabled])

  return {
    data,
    isLoading,
    error,
  }
}

// Hook to get unique occupations
export function useOcupacoes() {
  const { data, isLoading, error } = useCNAEs({ pageSize: 1000 })

  const ocupacoes = data?.data
    ? Array.from(new Set(data.data.map(cnae => cnae.ocupacao))).sort()
    : []

  return {
    ocupacoes,
    isLoading,
    error,
  }
}

// Hook to get services for a specific occupation with CNAE data
export function useServicos(ocupacao?: string) {
  const { data, isLoading, error } = useCNAEs({
    ocupacao,
    enabled: !!ocupacao,
    pageSize: 1000,
  })

  // Return full CNAE objects so we can access the ID
  const cnaes = data?.data || []

  return {
    cnaes,
    isLoading,
    error,
  }
}

// Helper hook to get full CNAE data by ocupacao and servico
export function useCNAEData() {
  const { data } = useCNAEs({ pageSize: 1000 })

  const getCNAEByOcupacaoAndServico = (
    ocupacao: string,
    servico: string
  ): CNAE | undefined => {
    return data?.data?.find(
      cnae => cnae.ocupacao === ocupacao && cnae.servico === servico
    )
  }

  return {
    getCNAEByOcupacaoAndServico,
  }
}

/**
 * Normalizes a CNAE subclasse input to the format expected by the API (XXXX-X/XX)
 * Accepts both formatted (8630-5/01) and unformatted (8630501) inputs
 * 
 * Format: XXXX-X/XX (7 digits total)
 * Example: 8630501 -> 8630-5/01
 */
function normalizeCnaeSubclasse(input: string): string {
  if (!input) return input

  const trimmed = input.trim()

  // If it's already in the correct format (contains - and /), return as is
  if (trimmed.includes('-') && trimmed.includes('/')) {
    return trimmed
  }

  // Remove all non-numeric characters to get just the digits
  const digitsOnly = input.replace(/[^\d]/g, '')

  // If we have exactly 7 digits, format it as XXXX-X/XX
  if (digitsOnly.length === 7) {
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 5)}/${digitsOnly.slice(5, 7)}`
  }

  // If we have 5 or 6 digits, try to format what we can
  // This helps with partial typing (e.g., user types "86305")
  if (digitsOnly.length >= 5 && digitsOnly.length < 7) {
    const part1 = digitsOnly.slice(0, 4)
    const part2 = digitsOnly.slice(4, 5)
    const part3 = digitsOnly.slice(5, 7) || ''
    if (part3) {
      return `${part1}-${part2}/${part3}`
    }
    return `${part1}-${part2}`
  }

  // For other cases (less than 5 digits or more than 7), return as is
  // The API might handle partial matches or the user might be typing
  return trimmed
}

// Hook to search CNAEs by subclasse using Next.js API route
export function useCnaesBySubclasse(subclasse?: string, enabled = true) {
  const [data, setData] = useState<ModelsCNAE[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !subclasse || subclasse.trim() === '') {
      setData([])
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Normalize the subclasse input to the format expected by the API
        const normalizedSubclasse = normalizeCnaeSubclasse(subclasse.trim())

        const params = new URLSearchParams({
          subclasse: normalizedSubclasse,
          per_page: '100',
        })

        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch CNAEs')
        }

        const result = await response.json()

        if (result.success && result.cnaes) {
          setData(result.cnaes)
        } else {
          setData([])
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [subclasse, enabled])

  return {
    cnaes: data,
    isLoading,
    error,
  }
}
