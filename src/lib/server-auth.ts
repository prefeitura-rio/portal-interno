import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'
import { redirect } from 'next/navigation'

/**
 * Server-side function to get user roles from Heimdall API
 * Use this in Server Components to check authorization
 *
 * @returns Array of user roles or null if failed
 */
export async function getUserRolesServer(): Promise<string[] | null> {
  try {
    const response = await getCurrentUserInfoApiV1UsersMeGet()

    if (response.status === 200 && response.data) {
      return response.data.roles || []
    }

    return null
  } catch (error) {
    console.error('Error fetching user roles from Heimdall:', error)
    return null
  }
}

/**
 * Server-side function to check if user has any of the required roles
 * Redirects to /unauthorized if user doesn't have access
 *
 * @param requiredRoles - Array of roles that grant access
 * @returns User roles if authorized
 */
export async function requireRoles(requiredRoles: string[]): Promise<string[]> {
  const userRoles = await getUserRolesServer()

  if (!userRoles || userRoles.length === 0) {
    redirect('/unauthorized')
  }

  const hasAccess = userRoles.some(role => requiredRoles.includes(role))

  if (!hasAccess) {
    redirect('/unauthorized')
  }

  return userRoles
}

/**
 * Check if user has GO Rio access (admin, superadmin, or go:admin)
 * Redirects to /unauthorized if user doesn't have access
 */
export async function requireGoRioAccess(): Promise<string[]> {
  return requireRoles(['admin', 'superadmin', 'go:admin'])
}

/**
 * Check if user has admin privileges (admin or superadmin)
 * Redirects to /unauthorized if user doesn't have access
 */
export async function requireAdminAccess(): Promise<string[]> {
  return requireRoles(['admin', 'superadmin'])
}

/**
 * Check if user has Busca services access
 * Redirects to /unauthorized if user doesn't have access
 */
export async function requireBuscaServicesAccess(): Promise<string[]> {
  return requireRoles([
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ])
}
