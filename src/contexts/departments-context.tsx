'use client'

import type { Department } from '@/types/department'
import type React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

interface DepartmentsContextType {
  departments: Department[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getDepartmentBycdUa: (cd_ua: string) => Department | undefined
}

const DepartmentsContext = createContext<DepartmentsContextType | undefined>(
  undefined
)

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'departments_cache'
const CACHE_TIMESTAMP_KEY = 'departments_cache_timestamp'

interface CacheData {
  departments: Department[]
  timestamp: number
}

export function DepartmentsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFromCache = useCallback((): Department[] | null => {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

      if (cached && timestamp) {
        const cacheTime = Number.parseInt(timestamp)
        const now = Date.now()

        if (now - cacheTime < CACHE_DURATION) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.error('Error loading departments from cache:', error)
    }

    return null
  }, [])

  const saveToCache = useCallback((data: Department[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error('Error saving departments to cache:', error)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to load from cache first
      const cached = loadFromCache()
      if (cached) {
        setDepartments(cached)
        setLoading(false)
        return
      }

      const response = await fetch('/api/departments?limit=1000')

      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }

      const result = await response.json()

      if (result.success && result.data) {
        setDepartments(result.data)
        saveToCache(result.data)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [loadFromCache, saveToCache])

  const refetch = async () => {
    // Clear cache and refetch
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    }
    await fetchDepartments()
  }

  const getDepartmentBycdUa = (cd_ua: string): Department | undefined => {
    return departments.find(dept => dept.cd_ua === cd_ua)
  }

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  return (
    <DepartmentsContext.Provider
      value={{
        departments,
        loading,
        error,
        refetch,
        getDepartmentBycdUa,
      }}
    >
      {children}
    </DepartmentsContext.Provider>
  )
}

export function useDepartmentsContext() {
  const context = useContext(DepartmentsContext)
  if (context === undefined) {
    throw new Error(
      'useDepartmentsContext must be used within a DepartmentsProvider'
    )
  }
  return context
}
