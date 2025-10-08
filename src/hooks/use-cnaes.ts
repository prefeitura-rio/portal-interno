import { useEffect, useState } from 'react'

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

// Hook to get services for a specific occupation
export function useServicos(ocupacao?: string) {
  const { data, isLoading, error } = useCNAEs({
    ocupacao,
    enabled: !!ocupacao,
    pageSize: 1000,
  })

  const servicos = data?.data?.map(cnae => cnae.servico) || []

  return {
    servicos,
    isLoading,
    error,
  }
}
