/**
 * Heimdall RBAC Role Types
 *
 * These roles are fetched from the Heimdall API and control access to different parts of the application.
 */

/**
 * Available roles in the Heimdall system
 */
export type HeimdallRole =
  | 'admin' // Full system admin - access to everything
  | 'superadmin' // Super admin - access to everything
  | 'busca:services:admin' // Admin for Busca services module
  | 'busca:services:editor' // Editor for Busca services module
  | 'go:admin' // Admin for GO Rio module only

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
 * Check if user has access to GO Rio module
 */
export function hasGoRioAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasAdminPrivileges(roles) || roles.includes('go:admin')
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
