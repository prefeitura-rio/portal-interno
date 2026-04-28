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
 * Roles that grant access to the "Cursos" (Capacitação) module
 */
export const COURSES_ROLES = [
  'admin',
  'superadmin',
  'go:admin',
  'go:cursos:casa_civil', // Casa Civil curadoria
  'go:cursos:editor', // Editor de cursos (secretaria)
] as const

export type CoursesRole = (typeof COURSES_ROLES)[number]

/**
 * Available roles in the Heimdall system
 */
export type HeimdallRole =
  | 'admin' // Full system admin - access to everything
  | 'superadmin' // Super admin - access to everything
  | 'busca:services:admin' // Admin for Busca services module
  | 'busca:services:editor' // Editor for Busca services module
  | 'go:admin' // Admin for GO Rio module only
  | 'go:cursos:casa_civil' // Casa Civil curation for courses
  | 'go:cursos:editor' // Editor de cursos (secretaria)
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
    'go:cursos:casa_civil',
    'go:cursos:editor',
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

/**
 * Check if user has access to Casa Civil curation (courses approval/review).
 * Curadoria-level access: can approve, publish, reject, agree-with-deletion.
 */
export function hasCasaCivilAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return (
    hasAdminPrivileges(roles) ||
    roles.includes('go:admin') ||
    roles.includes('go:cursos:casa_civil')
  )
}

/**
 * Access to the Cursos module as an editor or above.
 * Includes admin/superadmin/go:admin, Casa Civil and the new go:cursos:editor.
 */
export function hasCursosEditorAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return hasCasaCivilAccess(roles) || roles.includes('go:cursos:editor')
}

/** Can approve/reject courses in review (Casa Civil curation). */
export function canApproveCourses(roles: string[] | undefined): boolean {
  return hasCasaCivilAccess(roles)
}

/** Can publish courses directly. */
export function canPublishCourses(roles: string[] | undefined): boolean {
  return hasCasaCivilAccess(roles)
}

/** Can perform the final course deletion (after pending_deletion). */
export function canFinalDeleteCourse(roles: string[] | undefined): boolean {
  return hasCasaCivilAccess(roles)
}

/** Can create/edit/duplicate/save-draft/send-to-review/request-changes/request-deletion. */
export function canEditCourses(roles: string[] | undefined): boolean {
  return hasCursosEditorAccess(roles)
}

/** Can delete own draft (status=draft). Editor can. */
export function canDeleteOwnDraft(roles: string[] | undefined): boolean {
  return hasCursosEditorAccess(roles)
}

/** Can manage enrollments (approve/reject/complete). */
export function canManageEnrollments(roles: string[] | undefined): boolean {
  return hasCursosEditorAccess(roles)
}
