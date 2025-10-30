"use client"

import type { UserInfo } from '@/lib/user-info'
import { createContext, useContext } from 'react'

interface UserContextType {
  userInfo: UserInfo
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ 
  children, 
  userInfo 
}: { 
  children: React.ReactNode
  userInfo: UserInfo
}) {
  return (
    <UserContext.Provider value={{ userInfo }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 