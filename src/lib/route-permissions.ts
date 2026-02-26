import { EMPREGO_TRABALHO_ROLES } from '@/types/heimdall-roles'

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
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ],

  // GO Rio - Capacitação (only admin, superadmin, go:admin - NOT empregabilidade roles)
  '/gorio/courses': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses/new': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses/course/*': ['admin', 'superadmin', 'go:admin'],

  // GO Rio - MEI (only admin, superadmin, go:admin - NOT empregabilidade roles)
  '/gorio/oportunidades-mei': ['admin', 'superadmin', 'go:admin'],
  '/gorio/oportunidades-mei/new': ['admin', 'superadmin', 'go:admin'],
  '/gorio/oportunidades-mei/oportunidade-mei/*': [
    'admin',
    'superadmin',
    'go:admin',
  ],

  // GO Rio - Empregabilidade (admin, superadmin, go:admin + 3 empregabilidade roles)
  '/gorio/empregabilidade': [...EMPREGO_TRABALHO_ROLES],
  '/gorio/empregabilidade/new': [...EMPREGO_TRABALHO_ROLES],
  // Empresas: editor_com_curadoria cannot create/edit - list and new must be before /* so they match first
  '/gorio/empregabilidade/empresas': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
  ],
  '/gorio/empregabilidade/new/empresa': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
  ],
  '/gorio/empregabilidade/empresas/*': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
  ],
  '/gorio/empregabilidade/*': [...EMPREGO_TRABALHO_ROLES],

  // Serviços Municipais (admin, superadmin, busca:services roles - NOT empregabilidade)
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
    'busca:services:editor',
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
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ],
} as const

/**
 * Checks if a user has access to a specific route based on their roles from Heimdall
 * @param route - The route to check
 * @param userRoles - Array of user's roles from Heimdall API
 * @param cpf - Optional CPF for logging purposes
 * @returns boolean indicating if access is allowed
 */
export function hasRouteAccess(
  route: string,
  userRoles: string[] | null | undefined,
  cpf?: string
): boolean {
  const logPrefix = cpf ? `[${cpf}] [ROUTE_PERMISSIONS]` : '[ROUTE_PERMISSIONS]'

  if (!userRoles || userRoles.length === 0) {
    console.warn(
      `${logPrefix} Access denied for route "${route}": No user roles provided (userRoles is ${userRoles === null ? 'null' : userRoles === undefined ? 'undefined' : 'empty array'})`
    )
    return false
  }

  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    const hasAccess = userRoles.some(role => exactMatch.includes(role))
    console.log(
      `${logPrefix} Exact match for route "${route}":`,
      hasAccess,
      'Required roles:',
      exactMatch,
      'User roles:',
      userRoles
    )
    return hasAccess
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        const hasAccess = userRoles.some(role => allowedRoles.includes(role))
        console.log(
          `${logPrefix} Wildcard match for route "${route}" (pattern: "${routePattern}"):`,
          hasAccess,
          'Required roles:',
          allowedRoles,
          'User roles:',
          userRoles
        )
        return hasAccess
      }
    }
  }

  // Default to denying access for unmatched routes
  console.warn(
    `${logPrefix} No permission rule found for route "${route}". Access denied by default. User roles:`,
    userRoles
  )
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
