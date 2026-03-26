import { ProtectedRoute } from '@/components/auth/protected-route'
import { EMPREGO_TRABALHO_ROLES } from '@/types/heimdall-roles'

export default function GorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ProtectedRoute requiredRoles={[...EMPREGO_TRABALHO_ROLES]}>
        {children}
      </ProtectedRoute>
    </>
  )
}
