import { ProtectedRoute } from '@/components/auth/protected-route'

export default function GorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'superadmin', 'go:admin']}>
      {children}
    </ProtectedRoute>
  )
}
