'use client'

import type { Department } from '@/types/department'
import { useCallback, useEffect, useState } from 'react'

interface UseDepartmentsOptions {
  search?: string
  nivel?: number
  cd_ua_pai?: string
  limit?: number
}

export function useDepartments(options?: UseDepartmentsOptions) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options?.search) params.append('search', options.search)
      if (options?.nivel) params.append('nivel', options.nivel.toString())
      if (options?.cd_ua_pai) params.append('cd_ua_pai', options.cd_ua_pai)
      if (options?.limit) params.append('limit', options.limit.toString())
      else params.append('limit', '1000')

      const response = await fetch(`/api/departments?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }

      const result = await response.json()

      if (result.success && result.data) {
        setDepartments(result.data)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [options?.search, options?.nivel, options?.cd_ua_pai, options?.limit])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
  }
}

