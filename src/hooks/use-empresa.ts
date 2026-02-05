import type { EmpregabilidadeEmpresa } from '@/http-gorio/models'
import { useCallback, useEffect, useState } from 'react'

/**
 * ============================================================================
 * HOOK: useEmpresa
 * ============================================================================
 * Fetches a single empresa by CNPJ
 *
 * FEATURES:
 * - Automatic CNPJ validation
 * - Loading states
 * - Error handling
 * - Manual refetch capability
 * - Handles CNPJ formatting (accepts both masked and unmasked)
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const { empresa, loading, error, refetch } = useEmpresa('12345678000190')
 * // or with mask:
 * const { empresa, loading, error, refetch } = useEmpresa('12.345.678/0001-90')
 * ```
 */

export interface UseEmpresaResult {
  /** Empresa data (null if not found or loading) */
  empresa: EmpregabilidadeEmpresa | null
  /** Loading state */
  loading: boolean
  /** Error message (null if no error) */
  error: string | null
  /** Function to manually refetch empresa */
  refetch: () => Promise<void>
}

export function useEmpresa(cnpj: string | null): UseEmpresaResult {
  const [empresa, setEmpresa] = useState<EmpregabilidadeEmpresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetches empresa from API route
   *
   * DATA FLOW:
   * 1. Validate cnpj parameter
   * 2. Strip CNPJ mask (if present)
   * 3. Validate CNPJ format (14 digits)
   * 4. Fetch from /api/empregabilidade/empresas/[cnpj]
   * 5. Update state with empresa data
   *
   * ERROR HANDLING:
   * - Null or empty CNPJ
   * - Invalid CNPJ format
   * - 404 (empresa not found)
   * - Network errors
   */
  const fetchEmpresa = useCallback(async () => {
    // Handle null or empty CNPJ
    if (!cnpj) {
      setLoading(false)
      setError(null)
      setEmpresa(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Strip CNPJ mask to get only numbers
      // Input: "12.345.678/0001-90" or "12345678000190"
      // Output: "12345678000190"
      const cnpjNumbers = cnpj.replace(/\D/g, '')

      // Validate CNPJ has exactly 14 digits
      if (cnpjNumbers.length !== 14) {
        throw new Error(
          `CNPJ inválido: esperado 14 dígitos, recebido ${cnpjNumbers.length}`
        )
      }

      console.log('[useEmpresa] Fetching empresa:', cnpjNumbers)

      // Fetch empresa from API route
      const response = await fetch(
        `/api/empregabilidade/empresas/${cnpjNumbers}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Empresa não encontrada')
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch empresa`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch empresa')
      }

      // Extract empresa from response
      const empresaData = data.empresa

      setEmpresa(empresaData)
      console.log('[useEmpresa] Success:', empresaData)
    } catch (err) {
      console.error('[useEmpresa] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setEmpresa(null)
    } finally {
      setLoading(false)
    }
  }, [cnpj])

  // Fetch on mount and when CNPJ changes
  useEffect(() => {
    fetchEmpresa()
  }, [fetchEmpresa])

  return { empresa, loading, error, refetch: fetchEmpresa }
}
