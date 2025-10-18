'use client'

import type { HeimdallUser } from '@/types/heimdall-roles'
import {
  canEditBuscaServices,
  hasAdminPrivileges,
  hasBuscaServicesAccess,
  hasGoRioAccess,
  isBuscaServicesAdmin,
} from '@/types/heimdall-roles'
import { useEffect, useState } from 'react'

/**
 * Custom hook to get the current user's information from Heimdall API
 * (since access_token is stored in HTTP-only cookies)
 *
 * @returns HeimdallUser | null
 */
export function useHeimdallUser(): HeimdallUser | null {
  const [user, setUser] = useState<HeimdallUser | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/heimdall/user', {
          method: 'GET',
          credentials: 'include', // Important: include cookies in the request
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user from Heimdall:', error)
        setUser(null)
      }
    }

    fetchUser()
  }, [])

  return user
}

/**
 * Custom hook to get user information with loading state
 *
 * @returns { user: HeimdallUser | null, loading: boolean }
 */
export function useHeimdallUserWithLoading(): {
  user: HeimdallUser | null
  loading: boolean
} {
  const [user, setUser] = useState<HeimdallUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/heimdall/user', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user from Heimdall:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading }
}

/**
 * Custom hook to check if user has any of the specified roles
 *
 * @param allowedRoles - Array of allowed roles
 * @returns boolean indicating if user has access
 */
export function useHasRole(allowedRoles: string[]): boolean {
  const user = useHeimdallUser()
  if (!user?.roles) return false

  return user.roles.some(role => allowedRoles.includes(role))
}

/**
 * Custom hook to check if user has admin privileges (admin or superadmin)
 *
 * @returns boolean indicating if user is admin
 */
export function useIsAdmin(): boolean {
  const user = useHeimdallUser()
  return hasAdminPrivileges(user?.roles)
}

/**
 * Custom hook to check if user has access to GO Rio module
 *
 * @returns boolean indicating if user has GO Rio access
 */
export function useHasGoRioAccess(): boolean {
  const user = useHeimdallUser()
  return hasGoRioAccess(user?.roles)
}

/**
 * Custom hook to check if user has access to Busca services module
 *
 * @returns boolean indicating if user has Busca services access
 */
export function useHasBuscaServicesAccess(): boolean {
  const user = useHeimdallUser()
  return hasBuscaServicesAccess(user?.roles)
}

/**
 * Custom hook to check if user can edit in Busca services module
 *
 * @returns boolean indicating if user can edit
 */
export function useCanEditBuscaServices(): boolean {
  const user = useHeimdallUser()
  return canEditBuscaServices(user?.roles)
}

/**
 * Custom hook to check if user is admin of Busca services module
 *
 * @returns boolean indicating if user is Busca services admin
 */
export function useIsBuscaServicesAdmin(): boolean {
  const user = useHeimdallUser()
  return isBuscaServicesAdmin(user?.roles)
}
