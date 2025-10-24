'use client'

import { useUserRoleWithLoading } from '@/hooks/use-user-role'
import type { UserRole } from '@/lib/jwt-utils'
import { createContext, useContext, type ReactNode } from 'react'

interface UserRoleContextType {
  userRole: UserRole | null
  loading: boolean
  isAdmin: boolean
  hasElevatedPermissions: boolean
}

const UserRoleContext = createContext<UserRoleContextType | null>(null)

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { userRole, loading } = useUserRoleWithLoading()
  
  const isAdmin = userRole === 'admin'
  const hasElevatedPermissions = userRole === 'admin' || userRole === 'geral'

  return (
    <UserRoleContext.Provider
      value={{
        userRole,
        loading,
        isAdmin,
        hasElevatedPermissions,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRoleContext() {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error('useUserRoleContext must be used within a UserRoleProvider')
  }
  return context
}
