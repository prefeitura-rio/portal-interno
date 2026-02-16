'use client'

import { useHeimdallUserWithLoading } from '@/hooks/use-heimdall-user'
import type { HeimdallUser } from '@/types/heimdall-roles'
import {
  canEditBuscaServices,
  canEditGoRio,
  hasAdminPrivileges,
  hasBuscaServicesAccess,
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
  canEditGoRio: boolean
  isGoRioAdmin: boolean
  hasBuscaServicesAccess: boolean
  canEditBuscaServices: boolean
  isBuscaServicesAdmin: boolean
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
