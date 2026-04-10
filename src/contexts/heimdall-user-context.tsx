'use client'

import { useHeimdallUserWithLoading } from '@/hooks/use-heimdall-user'
import type { HeimdallUser } from '@/types/heimdall-roles'
import {
  canApproveCourses,
  canEditBuscaServices,
  canEditGoRio,
  canFreezeOrDiscontinueVaga,
  canManageEmpresasInEmpregabilidade,
  canPublishVagaAsAtivo,
  hasAdminPrivileges,
  hasBuscaServicesAccess,
  hasCasaCivilAccess,
  hasEmpregoTrabalhoAccess,
  hasGoRioAccess,
  isBuscaServicesAdmin,
  isGoRioAdmin,
} from '@/types/heimdall-roles'
import { type ReactNode, createContext, useContext } from 'react'

interface HeimdallUserContextType {
  user: HeimdallUser | null
  loading: boolean
  isAdmin: boolean
  hasGoRioAccess: boolean
  hasEmpregoTrabalhoAccess: boolean
  canEditGoRio: boolean
  isGoRioAdmin: boolean
  /** Can publish vaga as publicado_ativo (false for editor_com_curadoria) */
  canPublishVagaAsAtivo: boolean
  /** Can freeze/discontinue vaga (false for editor_com_curadoria) */
  canFreezeOrDiscontinueVaga: boolean
  /** Can create/edit empresas in empregabilidade (false for editor_com_curadoria) */
  canManageEmpresasInEmpregabilidade: boolean
  hasBuscaServicesAccess: boolean
  canEditBuscaServices: boolean
  isBuscaServicesAdmin: boolean
  /** NOVO - Casa Civil curation access */
  hasCasaCivilAccess: boolean
  /** NOVO - Can approve/reject courses in review */
  canApproveCourses: boolean
}

const HeimdallUserContext = createContext<HeimdallUserContextType | null>(null)

export function HeimdallUserProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useHeimdallUserWithLoading()

  const isAdmin = hasAdminPrivileges(user?.roles)
  const goRioAccess = hasGoRioAccess(user?.roles)
  const empregoTrabalhoAccess = hasEmpregoTrabalhoAccess(user?.roles)
  const canEditGoRioPermission = canEditGoRio(user?.roles)
  const isGoRioAdminPermission = isGoRioAdmin(user?.roles)
  const canPublishVaga = canPublishVagaAsAtivo(user?.roles)
  const canFreezeDiscontinue = canFreezeOrDiscontinueVaga(user?.roles)
  const canManageEmpresas = canManageEmpresasInEmpregabilidade(user?.roles)
  const buscaServicesAccess = hasBuscaServicesAccess(user?.roles)
  const canEdit = canEditBuscaServices(user?.roles)
  const isBuscaAdmin = isBuscaServicesAdmin(user?.roles)
  const casaCivilAccess = hasCasaCivilAccess(user?.roles) // NOVO
  const canApprove = canApproveCourses(user?.roles) // NOVO

  return (
    <HeimdallUserContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        hasGoRioAccess: goRioAccess,
        hasEmpregoTrabalhoAccess: empregoTrabalhoAccess,
        canEditGoRio: canEditGoRioPermission,
        isGoRioAdmin: isGoRioAdminPermission,
        canPublishVagaAsAtivo: canPublishVaga,
        canFreezeOrDiscontinueVaga: canFreezeDiscontinue,
        canManageEmpresasInEmpregabilidade: canManageEmpresas,
        hasBuscaServicesAccess: buscaServicesAccess,
        canEditBuscaServices: canEdit,
        isBuscaServicesAdmin: isBuscaAdmin,
        hasCasaCivilAccess: casaCivilAccess, // NOVO
        canApproveCourses: canApprove, // NOVO
      }}
    >
      {children}
    </HeimdallUserContext.Provider>
  )
}

export function useHeimdallUserContext() {
  const context = useContext(HeimdallUserContext)
  if (!context) {
    throw new Error(
      'useHeimdallUserContext must be used within a HeimdallUserProvider'
    )
  }
  return context
}
