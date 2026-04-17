import { ProtectedRoute } from '@/components/auth/protected-route'
import { COURSES_ROLES, EMPREGO_TRABALHO_ROLES } from '@/types/heimdall-roles'

// Combine roles from both modules under /gorio: Cursos (Capacitação) + Emprego e trabalho
const GORIO_ROLES = [...new Set([...EMPREGO_TRABALHO_ROLES, ...COURSES_ROLES])]

export default function GorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ProtectedRoute requiredRoles={GORIO_ROLES}>{children}</ProtectedRoute>
    </>
  )
}
