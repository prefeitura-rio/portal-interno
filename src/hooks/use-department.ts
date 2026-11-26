'use client'

import { loadDepartment, normalizeCdUa } from '@/lib/department-client'
import type { Department } from '@/types/department'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Órgão de um `cd_ua`. As linhas de uma tabela que pedem o mesmo órgão ao
 * mesmo tempo compartilham uma única requisição ao BFF, e o resultado fica
 * em cache na aba por 5 minutos (`src/lib/department-client.ts`, DEV-818).
 */
export function useDepartment(cd_ua: string | null | undefined) {
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Só a consulta mais recente atualiza o estado (cd_ua trocado no meio)
  const requestRef = useRef(0)

  const fetchDepartment = useCallback(async (id: string) => {
    const request = ++requestRef.current
    const isCurrent = () => requestRef.current === request
    const normalizedId = normalizeCdUa(id)

    if (!normalizedId) {
      setDepartment(null)
      setError('Invalid department id')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await loadDepartment(normalizedId)
      if (!isCurrent()) return
      if (result.status === 'found') {
        setDepartment(result.data)
      } else {
        setDepartment(null)
        setError('Department not found')
      }
    } catch (err) {
      if (!isCurrent()) return
      console.error('Error fetching department:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cd_ua) {
      fetchDepartment(cd_ua)
    } else {
      requestRef.current += 1
      setDepartment(null)
      setLoading(false)
      setError(null)
    }
  }, [cd_ua, fetchDepartment])

  // Desmontado, nenhuma consulta em voo atualiza o estado
  useEffect(() => {
    return () => {
      requestRef.current += 1
    }
  }, [])

  return {
    department,
    loading,
    error,
    refetch: () => cd_ua && fetchDepartment(cd_ua),
  }
}
