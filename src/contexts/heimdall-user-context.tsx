'use client'

import { useHeimdallUserWithLoading } from '@/hooks/use-heimdall-user'
import type { HeimdallUser } from '@/types/heimdall-roles'
import {
  canApproveCourses,
  canDeleteOwnDraft,
  canEditBuscaServices,
  canEditCourses,
  canEditGoRio,
  canFinalDeleteCourse,
  canFreezeOrDiscontinueVaga,
  canManageEmpresasInEmpregabilidade,
  canManageEnrollments,
  canPublishCourses,
  canPublishVagaAsAtivo,
  hasAdminPrivileges,
  hasBuscaServicesAccess,
  hasCasaCivilAccess,
  hasCursosEditorAccess,
  hasEmpregoTrabalhoAccess,
  hasGoRioAccess,
  isBuscaServicesAdmin,
  isGoRioAdmin,
} from '@/types/heimdall-roles'
import { createContext, useContext, type ReactNode } from 'react'

interface HeimdallUserContextType {
  user: HeimdallUser | null
  loading: boolean
  isAdmin: boolean
  hasGoRioAccess: boolean
  canEditGoRio: boolean
  isGoRioAdmin: boolean
  hasBuscaServicesAccess: boolean
  canEditBuscaServices: boolean
  isBuscaServicesAdmin: boolean
  /** Casa Civil curation access */
  hasCasaCivilAccess: boolean
  /** Editor-or-above access to the Cursos module */
  hasCursosEditorAccess: boolean
  /** Can approve/reject courses in review (Casa Civil) */
  canApproveCourses: boolean
  /** Can publish courses directly (Casa Civil) */
  canPublishCourses: boolean
  /** Can perform final course deletion (Casa Civil) */
  canFinalDeleteCourse: boolean
  /** Can create/edit/duplicate/save-draft/send-to-review/request-changes/request-deletion */
  canEditCourses: boolean
  /** Can delete own draft */
  canDeleteOwnDraft: boolean
  /** Can manage enrollments (approve/reject/complete) */
  canManageEnrollments: boolean
}

const HeimdallUserContext = createContext<HeimdallUserContextType | null>(null)

export function HeimdallUserProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useHeimdallUserWithLoading()

  const isAdmin = hasAdminPrivileges(user?.roles)
  const goRioAccess = hasGoRioAccess(user?.roles)
  const canEditGoRioPermission = canEditGoRio(user?.roles)
  const isGoRioAdminPermission = isGoRioAdmin(user?.roles)
  const buscaServicesAccess = hasBuscaServicesAccess(user?.roles)
  const canEdit = canEditBuscaServices(user?.roles)
  const isBuscaAdmin = isBuscaServicesAdmin(user?.roles)
  const casaCivilAccess = hasCasaCivilAccess(user?.roles)
  const cursosEditorAccess = hasCursosEditorAccess(user?.roles)
  const canApprove = canApproveCourses(user?.roles)
  const canPublish = canPublishCourses(user?.roles)
  const canFinalDelete = canFinalDeleteCourse(user?.roles)
  const canEditCoursesPermission = canEditCourses(user?.roles)
  const canDeleteDraft = canDeleteOwnDraft(user?.roles)
  const canManageEnrollmentsPermission = canManageEnrollments(user?.roles)

  return (
    <HeimdallUserContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        hasGoRioAccess: goRioAccess,
        canEditGoRio: canEditGoRioPermission,
        isGoRioAdmin: isGoRioAdminPermission,
        hasBuscaServicesAccess: buscaServicesAccess,
        canEditBuscaServices: canEdit,
        isBuscaServicesAdmin: isBuscaAdmin,
        hasCasaCivilAccess: casaCivilAccess,
        hasCursosEditorAccess: cursosEditorAccess,
        canApproveCourses: canApprove,
        canPublishCourses: canPublish,
        canFinalDeleteCourse: canFinalDelete,
        canEditCourses: canEditCoursesPermission,
        canDeleteOwnDraft: canDeleteDraft,
        canManageEnrollments: canManageEnrollmentsPermission,
      }}
    >
      {children}
    </HeimdallUserContext.Provider>
  )
}

export function useHeimdallUserContext() {
  const context = useContext(HeimdallUserContext)
  if (!context) {
    throw new Error('useHeimdallUserContext must be used within a HeimdallUserProvider')
  }
  return context
}
