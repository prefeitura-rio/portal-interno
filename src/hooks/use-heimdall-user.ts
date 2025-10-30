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

// Global cache for user data - ensures single API call across the app
let cachedUser: HeimdallUser | null = null
let isLoading = false
let loadingPromise: Promise<HeimdallUser | null> | null = null
const subscribers = new Set<(user: HeimdallUser | null) => void>()

/**
 * Fetches user data from Heimdall API with global caching
 * Ensures only one API call is made even with multiple subscribers
 */
async function fetchHeimdallUser(): Promise<HeimdallUser | null> {
  // If we already have cached data, return it immediately
  if (cachedUser !== null) {
    return cachedUser
  }

  // If a fetch is already in progress, wait for it
  if (isLoading && loadingPromise) {
    return loadingPromise
  }

  // Start a new fetch
  isLoading = true
  loadingPromise = (async () => {
    try {
      const response = await fetch('/api/heimdall/user', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        cachedUser = data
        notifySubscribers(data)
        return data
      }

      cachedUser = null
      notifySubscribers(null)
      return null
    } catch (error) {
      console.error('Error fetching user from Heimdall:', error)
      cachedUser = null
      notifySubscribers(null)
      return null
    } finally {
      isLoading = false
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * Notify all subscribers when user data changes
 */
function notifySubscribers(user: HeimdallUser | null) {
  subscribers.forEach(callback => callback(user))
}

/**
 * Subscribe to user data changes
 */
function subscribe(callback: (user: HeimdallUser | null) => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

/**
 * Clear the cache (useful for logout or manual refresh)
 */
export function clearHeimdallUserCache() {
  cachedUser = null
  notifySubscribers(null)
}

/**
 * Custom hook to get the current user's information from Heimdall API
 * Uses global cache to ensure single API call across the app
 *
 * @returns HeimdallUser | null
 */
export function useHeimdallUser(): HeimdallUser | null {
  const [user, setUser] = useState<HeimdallUser | null>(cachedUser)

  useEffect(() => {
    // If we already have cached data, use it
    if (cachedUser !== null) {
      setUser(cachedUser)
    } else {
      // Fetch user data
      fetchHeimdallUser().then(setUser)
    }

    // Subscribe to updates
    const unsubscribe = subscribe(setUser)
    return () => {
      unsubscribe()
    }
  }, [])

  return user
}

/**
 * Custom hook to get user information with loading state
 * Uses global cache to ensure single API call across the app
 *
 * @returns { user: HeimdallUser | null, loading: boolean }
 */
export function useHeimdallUserWithLoading(): {
  user: HeimdallUser | null
  loading: boolean
} {
  const [user, setUser] = useState<HeimdallUser | null>(cachedUser)
  const [loading, setLoading] = useState(cachedUser === null)

  useEffect(() => {
    // If we already have cached data, use it
    if (cachedUser !== null) {
      setUser(cachedUser)
      setLoading(false)
    } else {
      // Fetch user data
      setLoading(true)
      fetchHeimdallUser().then(data => {
        setUser(data)
        setLoading(false)
      })
    }

    // Subscribe to updates
    const unsubscribe = subscribe(data => {
      setUser(data)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
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
