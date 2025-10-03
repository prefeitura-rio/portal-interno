import type { UserRole } from './jwt-utils'

/**
 * Route permission configuration
 * Maps routes to their required roles
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard - accessible to all authenticated users
  '/': ['admin', 'geral', 'editor'],

  // GO Rio - Capacitação
  '/gorio/courses': ['admin', 'geral'],
  '/gorio/courses/new': ['admin', 'geral'],
  '/gorio/courses/course/*': ['admin', 'geral'],

  // GO Rio - Emprego e Trabalho
  '/gorio/oportunidades-mei': ['admin', 'geral'],
  '/gorio/oportunidades-mei/new': ['admin', 'geral'],

  // Serviços Municipais
  '/servicos-municipais/servicos': ['admin', 'geral', 'editor'],
  '/servicos-municipais/servicos/new': ['admin', 'geral'],
  '/servicos-municipais/servicos/servico/*': ['admin', 'geral', 'editor'], // Wildcard for service details

  // Account - accessible to all authenticated users
  '/account': ['admin', 'geral', 'editor'],
} as const

/**
 * Checks if a user role has access to a specific route
 * @param route - The route to check
 * @param userRole - The user's role
 * @returns boolean indicating if access is allowed
 */
export function hasRouteAccess(
  route: string,
  userRole: UserRole | null
): boolean {
  if (!userRole) return false

  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    return exactMatch.includes(userRole)
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        return allowedRoles.includes(userRole)
      }
    }
  }

  // Default to denying access for unmatched routes
  return false
}

/**
 * Gets all allowed roles for a specific route
 * @param route - The route to check
 * @returns Array of allowed roles or null if route not found
 */
export function getAllowedRoles(route: string): UserRole[] | null {
  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    return exactMatch
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        return allowedRoles
      }
    }
  }

  return null
}
