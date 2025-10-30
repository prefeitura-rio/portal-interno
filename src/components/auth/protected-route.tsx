'use client'

import { useHeimdallUserWithLoading } from '@/hooks/use-heimdall-user'
import { hasRouteAccess } from '@/lib/route-permissions'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

/**
 * Client-side route protection component
 * Checks if user has required roles and redirects to /unauthorized if not
 *
 * Usage:
 * <ProtectedRoute requiredRoles={['admin', 'superadmin', 'go:admin']}>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useHeimdallUserWithLoading()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    // If no user or no roles, redirect to unauthorized
    if (!user?.roles || user.roles.length === 0) {
      router.push('/unauthorized')
      return
    }

    // If specific roles are required, check them
    if (requiredRoles && requiredRoles.length > 0) {
      const hasAccess = user.roles.some(role => requiredRoles.includes(role))
      if (!hasAccess) {
        router.push('/unauthorized')
        return
      }
    }

    // If no specific roles provided, use route-based permissions
    if (!requiredRoles) {
      const hasAccess = hasRouteAccess(pathname, user.roles)
      if (!hasAccess) {
        router.push('/unauthorized')
      }
    }
  }, [user, loading, router, pathname, requiredRoles])

  // Show loading state while checking authorization
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Don't render children if no user or during redirect
  if (!user?.roles || user.roles.length === 0) {
    return null
  }

  // If specific roles are required, check them
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = user.roles.some(role => requiredRoles.includes(role))
    if (!hasAccess) {
      return null
    }
  }

  // If no specific roles provided, use route-based permissions
  if (!requiredRoles) {
    const hasAccess = hasRouteAccess(pathname, user.roles)
    if (!hasAccess) {
      return null
    }
  }

  return <>{children}</>
}
