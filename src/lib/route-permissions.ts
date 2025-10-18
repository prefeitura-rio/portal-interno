/**
 * Route permission configuration using Heimdall roles
 * Maps routes to their required roles from the Heimdall API
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Dashboard - accessible to all authenticated users with any role
  '/': [
    'admin',
    'superadmin',
    'go:admin',
    'busca:services:admin',
    'busca:services:editor',
  ],

  // GO Rio - Capacitação (only admin, superadmin, and go:admin)
  '/gorio/courses': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses/new': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses/course/*': ['admin', 'superadmin', 'go:admin'],

  // GO Rio - Emprego e Trabalho (only admin, superadmin, and go:admin)
  '/gorio/jobs': ['admin', 'superadmin', 'go:admin'],
  '/gorio/jobs/new': ['admin', 'superadmin', 'go:admin'],

  // Serviços Municipais (admin, superadmin, busca:services roles)
  '/servicos-municipais/servicos': [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ],
  '/servicos-municipais/servicos/new': [
    'admin',
    'superadmin',
    'busca:services:admin',
  ],
  '/servicos-municipais/servicos/servico/*': [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ],

  // Account - accessible to all authenticated users
  '/account': [
    'admin',
    'superadmin',
    'go:admin',
    'busca:services:admin',
    'busca:services:editor',
  ],
} as const

/**
 * Checks if a user has access to a specific route based on their roles from Heimdall
 * @param route - The route to check
 * @param userRoles - Array of user's roles from Heimdall API
 * @returns boolean indicating if access is allowed
 */
export function hasRouteAccess(
  route: string,
  userRoles: string[] | null | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false

  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    return userRoles.some(role => exactMatch.includes(role))
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        return userRoles.some(role => allowedRoles.includes(role))
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
export function getAllowedRoles(route: string): string[] | null {
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
