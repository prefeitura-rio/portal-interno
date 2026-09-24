import { ProtectedRoute } from '@/components/auth/protected-route'
import {
  COURSES_ROLES,
  CURRICULOS_ROLES,
  EMPREGO_TRABALHO_ROLES,
} from '@/types/heimdall-roles'

// Combine roles from every module under /gorio: Capacitação, Emprego e trabalho
// e Banco de currículos. O middleware restringe cada sub-rota ao seu módulo.
const GORIO_ROLES = [
  ...new Set([
    ...EMPREGO_TRABALHO_ROLES,
    ...COURSES_ROLES,
    ...CURRICULOS_ROLES,
  ]),
]

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
