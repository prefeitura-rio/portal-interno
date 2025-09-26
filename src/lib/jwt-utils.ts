import { jwtDecode } from 'jwt-decode'

// Define role types for better type safety
export type UserRole = 'admin' | 'geral' | 'editor'

export interface JWTPayload {
  exp?: number
  resource_access?: {
    [key: string]: {
      roles?: string[]
    }
  }
}

export function isJwtExpired(token: string): boolean {
  try {
    const decoded: { exp?: number } = jwtDecode(token)
    if (!decoded.exp) return true // If no exp field, consider it expired
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp < now
  } catch {
    return false
  }
}

/**
 * Helper function to extract roles from JWT token from various possible locations
 * @param token - JWT access token
 * @returns Array of roles or empty array if not found
 */
function getRolesFromToken(token: string): string[] {
  const clientId = process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID

  try {
    const decoded: JWTPayload = jwtDecode(token)

    // First try the client ID (if available)
    if (clientId && decoded.resource_access?.[clientId]?.roles) {
      return decoded.resource_access[clientId].roles
    }
    // Then try 'superapp' key (common JWT structure)
    if (decoded.resource_access?.superapp?.roles) {
      return decoded.resource_access.superapp.roles
    }
    // Finally try all resource_access keys to find one with roles
    if (decoded.resource_access) {
      for (const [key, resource] of Object.entries(decoded.resource_access)) {
        if (resource?.roles && Array.isArray(resource.roles)) {
          return resource.roles
        }
      }
    }

    return []
  } catch {
    return []
  }
}

export function hasAdminLoginRole(token: string): boolean {
  const roles = getRolesFromToken(token)
  return roles.includes('admin:login')
}

/**
 * Extracts the user role from the JWT token by looking for "go:" prefix
 * @param token - JWT access token
 * @returns UserRole or null if not found
 */
export function getUserRole(token: string): UserRole | null {
  const roles = getRolesFromToken(token)

  // Find role that starts with "go:"
  const goRole = roles.find(role => role.startsWith('go:'))
  if (!goRole) return null

  // Extract role after "go:"
  const role = goRole.substring(3) as UserRole

  // Validate that it's a known role
  if (['admin', 'geral', 'editor'].includes(role)) {
    return role
  }

  return null
}

/**
 * Checks if the user has any of the specified roles
 * @param token - JWT access token
 * @param allowedRoles - Array of allowed roles
 * @returns boolean indicating if user has access
 */
export function hasRole(token: string, allowedRoles: UserRole[]): boolean {
  const userRole = getUserRole(token)
  return userRole ? allowedRoles.includes(userRole) : false
}

/**
 * Checks if the user is an admin (has admin role)
 * @param token - JWT access token
 * @returns boolean indicating if user is admin
 */
export function isAdmin(token: string): boolean {
  return getUserRole(token) === 'admin'
}

/**
 * Checks if the user has admin or geral role (for features that need elevated permissions)
 * @param token - JWT access token
 * @returns boolean indicating if user has elevated permissions
 */
export function hasElevatedPermissions(token: string): boolean {
  const userRole = getUserRole(token)
  return userRole === 'admin' || userRole === 'geral'
}
