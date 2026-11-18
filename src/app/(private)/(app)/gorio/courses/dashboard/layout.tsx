import { isCoursesDashboardEnabled } from '@/lib/feature-flags'
import { notFound } from 'next/navigation'

// A flag é lida a cada requisição, nunca no build: a troca no Infisical vale no
// reinício dos pods, sem novo build
export const dynamic = 'force-dynamic'

/**
 * Dashboard de Capacitações atrás da flag de runtime `FEATURE_COURSES_DASHBOARD`
 * (DEV-644): desligada, a página não renderiza para ninguém, inclusive admins.
 * O middleware já responde 404 depois do RBAC (`COURSES_DASHBOARD_ROLES`); este
 * `notFound()` é a segunda barreira, para as requisições que o middleware não
 * casa (prefetch do roteador).
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
