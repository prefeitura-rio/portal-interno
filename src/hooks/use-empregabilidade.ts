import { useCallback, useEffect, useState } from 'react'

interface UseEmpregabilidadeReturn {
  empregabilidade: any | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEmpregabilidade(
  empregabilidadeId: string | null
): UseEmpregabilidadeReturn {
  const [empregabilidade, setEmpregabilidade] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmpregabilidade = useCallback(async () => {
    if (!empregabilidadeId) {
      setLoading(false)
      setError(null)
      setEmpregabilidade(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/empregos/${empregabilidadeId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Empregabilidade not found')
        }
        throw new Error('Failed to fetch empregabilidade')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch empregabilidade')
      }

      // Extract the empregabilidade from the response structure
      const empregabilidadeData = data.emprego
      setEmpregabilidade(empregabilidadeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setEmpregabilidade(null)
    } finally {
      setLoading(false)
    }
  }, [empregabilidadeId])

  useEffect(() => {
    fetchEmpregabilidade()
  }, [fetchEmpregabilidade])

  return { empregabilidade, loading, error, refetch: fetchEmpregabilidade }
}
