import { getApiV1CoursesCourseId } from '@/http-gorio/courses/courses'
import { courseApiErrorMessage } from '@/lib/course-api-error-message'
import { getCurrentUserRoles } from '@/lib/heimdall-user'
import { hasCasaCivilAccess } from '@/types/heimdall-roles'
import { NextResponse } from 'next/server'

// DEV-127: três rotas do BFF de cursos servem tanto a curadoria da Casa Civil
// quanto ações do Editor, e a API de cursos (app-go-api) não distingue os
// papéis nelas: `CourseAuthorization` aceita `go:cursos:editor`,
// `RequestChanges` aceita curso em revisão, `Delete` não olha o status e o PUT
// grava o `status` do corpo. A regra por rota (route-permissions) não basta;
// estas funções decidem pelo status atual do curso, como a UI decide.

/**
 * Status como o app-go-api o persiste (`StatusCurso.Normalize`): os status
 * derivados de um curso publicado (`scheduled`, `accepting_enrollments`,
 * `in_progress`, `finished`) e os legados `ABERTO`/`opened` viram `published`,
 * `CRIADO` vira `draft` e `ENCERRADO` vira `closed`.
 */
export function normalizeCourseStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'CRIADO':
      return 'draft'
    case 'ABERTO':
    case 'OPENED':
    case 'SCHEDULED':
    case 'ACCEPTING_ENROLLMENTS':
    case 'IN_PROGRESS':
    case 'FINISHED':
      return 'published'
    case 'ENCERRADO':
      return 'closed'
    default:
      return status
  }
}

/**
 * Status do curso no corpo do GET da API de cursos (`{ success, data: curso }`)
 * ou no próprio curso. `undefined` quando o corpo não traz um status.
 */
export function extractCourseStatus(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const { data, status } = body as { data?: unknown; status?: unknown }
  if (data && typeof data === 'object') {
    const nested = (data as { status?: unknown }).status
    if (typeof nested === 'string' && nested) return nested
  }
  return typeof status === 'string' && status ? status : undefined
}

/** Quem tem a curadoria de cursos (Casa Civil, go:admin, admin, superadmin). */
export function hasCourseCurationAccess(roles: string[] | undefined): boolean {
  return hasCasaCivilAccess(roles)
}

/**
 * `PUT /courses/:id/request-changes` sem curadoria: só o "Propor edição" de
 * curso publicado (inclusive os status derivados e o encerrado `finished`).
 * Devolver curso em revisão ("Enviar para edição") é da Casa Civil.
 */
export function canRequestCourseChanges(
  roles: string[] | undefined,
  currentStatus: string
): boolean {
  if (hasCourseCurationAccess(roles)) return true
  return normalizeCourseStatus(currentStatus) === 'published'
}

/**
 * `DELETE /courses/:id` sem curadoria: só "Excluir rascunho". A exclusão de
 * curso em `pending_deletion` ("Concordar com a exclusão") é da Casa Civil.
 */
export function canDeleteCourse(
  roles: string[] | undefined,
  currentStatus: string
): boolean {
  if (hasCourseCurationAccess(roles)) return true
  return normalizeCourseStatus(currentStatus) === 'draft'
}

/**
 * `PUT /courses/:id` sem curadoria: salvar o curso sem mudar o status. A UI do
 * Editor reenvia o status atual (ou `published` para um curso `finished`);
 * publicar (`opened`), reabrir, cancelar ou mudar qualquer outro status pelo
 * corpo é da Casa Civil. Corpo sem `status` não muda status por aqui.
 */
export function canUpdateCourseStatus(
  roles: string[] | undefined,
  currentStatus: string,
  requestedStatus: unknown
): boolean {
  if (hasCourseCurationAccess(roles)) return true
  if (requestedStatus === undefined) return true
  if (typeof requestedStatus !== 'string') return false
  return (
    normalizeCourseStatus(requestedStatus) ===
    normalizeCourseStatus(currentStatus)
  )
}

/** Status pedido no corpo do PUT, ou `undefined` quando o corpo não traz. */
export function requestedCourseStatus(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  return (body as { status?: unknown }).status
}

export const COURSE_CURATION_FORBIDDEN_MESSAGE =
  'Ação de curadoria restrita à Casa Civil'

type CourseCurationRule = (
  roles: string[] | undefined,
  currentStatus: string
) => boolean

/**
 * Confere a regra da ação contra o status atual do curso e devolve a resposta
 * de recusa, ou `null` para seguir. Quem tem a curadoria segue sem a leitura do
 * curso. Sem conseguir ler o status, recusa (falha fechada).
 */
export async function denyCourseCurationAction(
  courseId: number,
  action: string,
  rule: CourseCurationRule
): Promise<NextResponse | null> {
  const roles = await getCurrentUserRoles()
  if (hasCourseCurationAccess(roles)) return null

  const response = await getApiV1CoursesCourseId(courseId)
  if (response.status !== 200) {
    return NextResponse.json(
      {
        error: courseApiErrorMessage(
          'Não foi possível conferir o status do curso',
          response.status,
          response.data
        ),
        success: false,
      },
      { status: response.status >= 500 ? 502 : response.status }
    )
  }

  const currentStatus = extractCourseStatus(response.data)
  if (!currentStatus) {
    return NextResponse.json(
      {
        error: 'Não foi possível conferir o status do curso',
        success: false,
      },
      { status: 502 }
    )
  }

  if (!rule(roles, currentStatus)) {
    console.warn(
      `[COURSES] ${action} denied for course ${courseId} with status "${currentStatus}": requires Casa Civil curation`
    )
    return NextResponse.json(
      { error: COURSE_CURATION_FORBIDDEN_MESSAGE, success: false },
      { status: 403 }
    )
  }

  return null
}
