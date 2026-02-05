import type { EmpregabilidadeVaga } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

export type VagaStatus =
  | 'em_edicao'
  | 'em_aprovacao'
  | 'publicado_ativo'
  | 'publicado_expirado'

export interface UseEmpregabilidadeVagasParams {
  page?: number
  pageSize?: number
  status?: VagaStatus
  companyId?: string
  titulo?: string
}

export interface UseEmpregabilidadeVagasResult {
  vagas: EmpregabilidadeVaga[]
  loading: boolean
  error: Error | null
  total: number
  pageCount: number
  refetch: () => void
}

export function useEmpregabilidadeVagas(
  params: UseEmpregabilidadeVagasParams = {}
): UseEmpregabilidadeVagasResult {
  const [vagas, setVagas] = useState<EmpregabilidadeVaga[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  const {
    page = 1,
    pageSize = 10,
    status = 'publicado_ativo',
    companyId,
    titulo,
  } = params

  const fetchVagas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build URL with query parameters
      const url = new URL('/api/empregabilidade/vagas', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('page_size', pageSize.toString())
      url.searchParams.set('status', status)

      if (companyId?.trim()) {
        url.searchParams.set('company_id', companyId.trim())
      }

      if (titulo?.trim()) {
        url.searchParams.set('titulo', titulo.trim())
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch empregabilidade vagas')
      }

      const data = await response.json()

      setVagas(data.data || [])
      setTotal(data.meta?.total || 0)
      setPageCount(Math.ceil((data.meta?.total || 0) / pageSize))
    } catch (err) {
      console.error('Error fetching empregabilidade vagas:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, status, companyId, titulo])

  useEffect(() => {
    fetchVagas()
  }, [fetchVagas])

  return {
    vagas,
    loading,
    error,
    total,
    pageCount,
    refetch: fetchVagas,
  }
}
