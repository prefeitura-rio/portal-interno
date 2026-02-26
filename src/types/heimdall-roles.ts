/**
 * Heimdall RBAC Role Types
 *
 * These roles are fetched from the Heimdall API and control access to different parts of the application.
 */

/**
 * Roles that grant access to the "Emprego e trabalho" module (oportunidades-mei, empregabilidade)
 */
export const EMPREGO_TRABALHO_ROLES = [
  'admin',
  'superadmin',
  'go:admin',
  'go:empregabilidade:admin',
  'go:empregabilidade:editor_sem_curadoria',
  'go:empregabilidade:editor_com_curadoria',
] as const

export type EmpregoTrabalhoRole = (typeof EMPREGO_TRABALHO_ROLES)[number]

/**
 * Available roles in the Heimdall system
 */
export type HeimdallRole =
  | 'admin' // Full system admin - access to everything
  | 'superadmin' // Super admin - access to everything
  | 'busca:services:admin' // Admin for Busca services module
  | 'busca:services:editor' // Editor for Busca services module
  | 'go:admin' // Admin for GO Rio module only
  | 'go:empregabilidade:admin' // Admin for Emprego e trabalho only
  | 'go:empregabilidade:editor_sem_curadoria' // Editor (sem curadoria) - Emprego e trabalho only
  | 'go:empregabilidade:editor_com_curadoria' // Editor (com curadoria) - Emprego e trabalho only

/**
 * User information from Heimdall API
 * This matches the UserResponse model from the API
 */
export interface HeimdallUser {
  id: number
  cpf: string
  display_name?: string
  groups?: string[]
  roles?: string[]
}

/**
 * Check if a role string is a valid Heimdall role
 */
export function isHeimdallRole(role: string): role is HeimdallRole {
  return [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ].includes(role)
}

/**
 * Filter and validate roles from the API response
 */
export function filterValidRoles(roles: string[] | undefined): HeimdallRole[] {
  if (!roles) return []
  return roles.filter(isHeimdallRole)
}

/**
 * Check if user has admin privileges (admin or superadmin)
 */
export function hasAdminPrivileges(roles: string[] | undefined): boolean {
  if (!roles) return false
  return roles.includes('admin') || roles.includes('superadmin')
}

/**
 * Check if user has access to GO Rio module (Capacitação + Emprego e trabalho)
 * Admin, superadmin, go:admin only (not the empregabilidade-only roles)
 */
export function hasGoRioAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasAdminPrivileges(roles) || roles.includes('go:admin')
}

/**
 * Check if user has access to the "Emprego e trabalho" module
 * (oportunidades-mei, empregabilidade). Includes admin, superadmin, go:admin and the 3 empregabilidade roles.
 */
export function hasEmpregoTrabalhoAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return EMPREGO_TRABALHO_ROLES.some(role => roles.includes(role))
}

/**
 * Check if user has ONLY access to Emprego e trabalho (one of the 3 empregabilidade roles)
 * and not admin/superadmin/go:admin. Used to hide other modules (Capacitação, Serviços) from menu.
 */
export function isOnlyEmpregoTrabalhoUser(
  roles: string[] | undefined
): boolean {
  if (!roles) return false
  const empregabilidadeOnlyRoles = [
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ] as const
  const hasEmpregabilidadeRole = empregabilidadeOnlyRoles.some(role =>
    roles.includes(role)
  )
  const hasFullAccess = hasAdminPrivileges(roles) || roles.includes('go:admin')
  return hasEmpregabilidadeRole && !hasFullAccess
}

/**
 * Check if user has access to Busca services module
 */
export function hasBuscaServicesAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return (
    hasAdminPrivileges(roles) ||
    roles.includes('busca:services:admin') ||
    roles.includes('busca:services:editor')
  )
}

/**
 * Check if user can edit in Busca services module
 */
export function canEditBuscaServices(roles: string[] | undefined): boolean {
  if (!roles) return false
  return (
    hasAdminPrivileges(roles) ||
    roles.includes('busca:services:admin') ||
    roles.includes('busca:services:editor')
  )
}

/**
 * Check if user is admin of Busca services module
 */
export function isBuscaServicesAdmin(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasAdminPrivileges(roles) || roles.includes('busca:services:admin')
}

/**
 * Check if user can edit in GO Rio module
 * Admin, superadmin, and go:admin can edit
 */
export function canEditGoRio(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasAdminPrivileges(roles) || roles.includes('go:admin')
}

/**
 * Check if user is admin of GO Rio module
 */
export function isGoRioAdmin(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasAdminPrivileges(roles) || roles.includes('go:admin')
}
