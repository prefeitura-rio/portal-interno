'use client'

import type { Department } from '@/types/department'
import { useCallback, useEffect, useState } from 'react'

// Cache for individual department lookups
const departmentCache = new Map<
  string,
  { data: Department; timestamp: number }
>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useDepartment(cd_ua: string | null | undefined) {
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartment = useCallback(async (id: string) => {
    const normalizedId = id.trim()

    if (!/^\d+$/.test(normalizedId)) {
      setDepartment(null)
      setError('Invalid department id')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = departmentCache.get(normalizedId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setDepartment(cached.data)
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/departments/${encodeURIComponent(normalizedId)}`
      )

      if (response.status === 404) {
        setDepartment(null)
        setError('Department not found')
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch department')
      }

      const result = await response.json()

      if (result.success && result.data) {
        const deptData = result.data
        setDepartment(deptData)
        // Cache the result
        departmentCache.set(normalizedId, {
          data: deptData,
          timestamp: Date.now(),
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching department:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cd_ua) {
      fetchDepartment(cd_ua)
    } else {
      setDepartment(null)
      setLoading(false)
      setError(null)
    }
  }, [cd_ua, fetchDepartment])

  return {
    department,
    loading,
    error,
    refetch: () => cd_ua && fetchDepartment(cd_ua),
  }
}
