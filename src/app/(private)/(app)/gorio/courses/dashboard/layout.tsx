import { isCoursesDashboardEnabled } from '@/lib/feature-flags'
import { notFound } from 'next/navigation'

// A flag é lida a cada requisição, nunca no build: a troca no Infisical vale no
// reinício dos pods, sem novo build
export const dynamic = 'force-dynamic'

/**
 * Dashboard de Capacitações atrás da flag de runtime `FEATURE_COURSES_DASHBOARD`
 * (DEV-644): desligada, a página responde 404 para todos, inclusive admins. O
 * RBAC (`COURSES_DASHBOARD_ROLES`) continua no middleware, antes desta checagem.
 */
export default function CoursesDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (!isCoursesDashboardEnabled()) {
    notFound()
  }
  return children
}
