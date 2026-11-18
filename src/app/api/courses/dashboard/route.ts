import { getApiV1Courses } from '@/http-gorio/courses/courses'
import { getApiV1CoursesCourseIdEnrollments } from '@/http-gorio/inscricoes/inscricoes'
import { getDepartmentsCdUa } from '@/http-rmi/departments/departments'
import {
  DASHBOARD_PUBLISHED_STATUSES,
  buildCoursesDashboard,
} from '@/lib/courses-dashboard'
import { resolveDepartmentNames } from '@/lib/department-names'
import { isCoursesDashboardEnabled } from '@/lib/feature-flags'
import { NextResponse } from 'next/server'

// A flag é lida a cada requisição, nunca no build: a troca no Infisical vale no
// reinício dos pods, sem novo build
export const dynamic = 'force-dynamic'

/**
 * Consolidado do Dashboard de Capacitações (DEV-100): cursos publicados e
 * total de inscritos por secretaria. O RBAC (Casa Civil e admins) fica no
 * middleware, em `API_ROUTE_PERMISSIONS`; a API Go devolve a esses papéis os
 * cursos de todas as secretarias. Os nomes das secretarias vêm da RMI, em lote
 * controlado e com cache no servidor (`resolveDepartmentNames`); as contagens
 * de inscrições também têm cache e novas tentativas (`countEnrollmentsByCourse`).
 *
 * Atrás da flag de runtime `FEATURE_COURSES_DASHBOARD` (DEV-644): desligada, a
 * rota responde 404 sem chamar nenhuma API, para qualquer papel. A flag soma-se
 * ao RBAC do middleware, que roda antes.
 */
export async function GET() {
  if (!isCoursesDashboardEnabled()) {
    return NextResponse.json(
      { error: 'Not found', success: false },
      { status: 404 }
    )
  }

  try {
    const result = await buildCoursesDashboard({
      listPublishedCoursesPage: (page, limit) =>
        getApiV1Courses({
          status: DASHBOARD_PUBLISHED_STATUSES.join(','),
          page,
          limit,
        }),
      // Só o total importa: uma inscrição por página basta
      fetchCourseEnrollments: (courseId, signal) =>
        getApiV1CoursesCourseIdEnrollments(
          courseId,
          { page: 1, limit: 1 },
          { signal }
        ),
      resolveSecretarias: orgaoIds =>
        resolveDepartmentNames(orgaoIds, (cdUa, signal) =>
          getDepartmentsCdUa(cdUa, { signal })
        ),
    })

    if (!result.ok) {
      // Só status, motivo e onde parou: nada de ids, token ou dado pessoal
      console.error('Courses dashboard: published courses listing failed', {
        status: result.status,
        reason: result.reason,
        page: result.page,
        attempts: result.attempts,
      })
      // Sessão inválida ou sem permissão na API Go segue como está; o resto
      // é falha da API de cursos
      const status =
        result.status === 401 || result.status === 403 ? result.status : 502
      return NextResponse.json(
        { error: 'Erro ao carregar os cursos publicados', success: false },
        { status }
      )
    }

    const { failed, fromStale, failures } = result.enrollmentStats
    if (failed > 0 || fromStale > 0) {
      // Só contagens agregadas por motivo: nada de ids, token ou dado pessoal
      console.warn('Courses dashboard: enrollment counts incomplete', {
        withoutCount: failed,
        fromStale,
        failures,
      })
    }

    return NextResponse.json({ ...result.summary, success: true })
  } catch (error) {
    console.error(
      'Error building courses dashboard:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
