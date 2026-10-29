'use client'

import type { CoursesDashboardSummary } from '@/lib/courses-dashboard'
import { COURSES_DASHBOARD_REFRESH_QUERY_OPTIONS } from '@/lib/courses-dashboard-refresh'
import { useQuery } from '@tanstack/react-query'

export const coursesDashboardKeys = {
  all: ['courses-dashboard'] as const,
}

/**
 * Consolidado de cursos publicados e inscritos por secretaria do Dashboard
 * de Capacitações (DEV-100), via BFF `/api/courses/dashboard`, revalidado
 * periodicamente (DEV-106).
 */
export function useCoursesDashboard() {
  return useQuery({
    queryKey: coursesDashboardKeys.all,
    queryFn: async (): Promise<CoursesDashboardSummary> => {
      const response = await fetch('/api/courses/dashboard', {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Falha ao carregar o consolidado (${response.status})`)
      }
      const body = (await response.json()) as CoursesDashboardSummary
      return { secretarias: body.secretarias, totals: body.totals }
    },
    // Consolidado pesado (uma consulta de inscrições por curso): uma nova
    // tentativa só, e sem refazer ao voltar o foco para a aba
    retry: 1,
    refetchOnWindowFocus: false,
    // Revalida sozinho a cada 2 horas, mesmo com a aba em segundo plano
    // (DEV-106)
    ...COURSES_DASHBOARD_REFRESH_QUERY_OPTIONS,
  })
}
