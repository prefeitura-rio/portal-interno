'use client'

import type { UserRole } from '@/lib/jwt-utils'
import { useEffect, useState } from 'react'

/**
 * Custom hook to get the current user's role from the server-side API
 * (since access_token is stored in HTTP-only cookies)
 * @returns UserRole | null
 */
export function useUserRole(): UserRole | null {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/user-role', {
          method: 'GET',
          credentials: 'include', // Important: include cookies in the request
        })

        if (response.ok) {
          const data = await response.json()
          setUserRole(data.role)
        } else {
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  return userRole
}

/**
 * Custom hook to get user role and loading state
 * @returns { userRole: UserRole | null, loading: boolean }
 */
export function useUserRoleWithLoading(): {
  userRole: UserRole | null
  loading: boolean
} {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/user-role', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setUserRole(data.role)
        } else {
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  return { userRole, loading }
}

/**
 * Custom hook to check if user has any of the specified roles
 * @param allowedRoles - Array of allowed roles
 * @returns boolean indicating if user has access
 */
export function useHasRole(allowedRoles: UserRole[]): boolean {
  const userRole = useUserRole()
  return userRole ? allowedRoles.includes(userRole) : false
}

/**
 * Custom hook to check if user is an admin
 * @returns boolean indicating if user is admin
 */
export function useIsAdmin(): boolean {
  const userRole = useUserRole()
  return userRole === 'admin'
}

/**
 * Custom hook to check if user has elevated permissions (admin or geral)
 * @returns boolean indicating if user has elevated permissions
 */
export function useHasElevatedPermissions(): boolean {
  const userRole = useUserRole()
  return userRole === 'admin' || userRole === 'geral'
}
