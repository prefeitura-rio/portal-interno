import type { EmpregabilidadeEmpresa } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

/**
 * ============================================================================
 * HOOK: useEmpresas
 * ============================================================================
 * Fetches and manages a paginated list of empresas with optional filtering
 *
 * FEATURES:
 * - Pagination support (page, pageSize)
 * - Search by name (nome query parameter)
 * - Loading states
 * - Error handling
 * - Manual refetch capability
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const { empresas, loading, error, total, pageCount, refetch } = useEmpresas({
 *   page: 1,
 *   pageSize: 10,
 *   nome: 'Empresa',
 * })
 * ```
 */

export interface UseEmpresasParams {
  /** Current page number (1-based) */
  page?: number
  /** Number of items per page */
  pageSize?: number
  /** Search query for empresa name (razao_social or nome_fantasia) */
  nome?: string
}

export interface UseEmpresasResult {
  /** Array of empresas */
  empresas: EmpregabilidadeEmpresa[]
  /** Loading state */
  loading: boolean
  /** Error object if fetch failed */
  error: Error | null
  /** Total number of empresas (for pagination) */
  total: number
  /** Total number of pages (calculated from total and pageSize) */
  pageCount: number
  /** Function to manually refetch data */
  refetch: () => void
}

export function useEmpresas(
  params: UseEmpresasParams = {}
): UseEmpresasResult {
  const [empresas, setEmpresas] = useState<EmpregabilidadeEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(0)

  const { page = 1, pageSize = 10, nome } = params

  /**
   * Fetches empresas from API route
   *
   * DATA FLOW:
   * 1. Build URL with query parameters
   * 2. Fetch from /api/empregabilidade/empresas
   * 3. Parse response and update state
   * 4. Calculate pageCount from total and pageSize
   *
   * ERROR HANDLING:
   * - Network errors
   * - HTTP error responses
   * - JSON parsing errors
   */
  const fetchEmpresas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build URL with query parameters
      const url = new URL(
        '/api/empregabilidade/empresas',
        window.location.origin
      )
      url.searchParams.set('page', page.toString())
      url.searchParams.set('page_size', pageSize.toString())

      // Add nome filter if provided and not empty
      if (nome?.trim()) {
        url.searchParams.set('nome', nome.trim())
      }

      console.log('[useEmpresas] Fetching:', url.toString())

      // Fetch empresas from API route
      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch empresas`)
      }

      const data = await response.json()

      // The API route returns: { empresas: [...], success: true }
      // But the backend may return paginated data like: { data: [...], meta: { total, ... } }

      // Handle both response formats
      const empresasData = data.empresas?.data || data.empresas || []
      const metaData = data.empresas?.meta || {}

      setEmpresas(empresasData)
      setTotal(metaData.total || 0)
      setPageCount(Math.ceil((metaData.total || 0) / pageSize))

      console.log('[useEmpresas] Success:', {
        count: empresasData.length,
        total: metaData.total,
        pageCount: Math.ceil((metaData.total || 0) / pageSize),
      })
    } catch (err) {
      console.error('[useEmpresas] Error:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setEmpresas([])
      setTotal(0)
      setPageCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, nome])

  // Fetch on mount and when parameters change
  useEffect(() => {
    fetchEmpresas()
  }, [fetchEmpresas])

  return {
    empresas,
    loading,
    error,
    total,
    pageCount,
    refetch: fetchEmpresas,
  }
}
