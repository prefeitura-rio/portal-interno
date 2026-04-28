import type {
  ApiCourse,
  CourseListItem,
  CourseStatus,
  CourseType,
} from '@/types/course'

const NO_TYPE_STATUSES = new Set([
  'closed',
  'canceled',
  'finished',
  'ENCERRADO',
  'CANCELADO',
  'draft',
])

function deriveCourseType(status: string): CourseType | undefined {
  if (status === 'needs_changes') return 'edit_proposal'
  if (status === 'pending_deletion') return 'deletion_proposal'
  if (NO_TYPE_STATUSES.has(status)) return undefined
  return 'new_course'
}

/**
 * Transforms an API course response to our frontend CourseListItem format
 */
export function transformApiCourseToCourseListItem(
  apiCourse: ApiCourse
): CourseListItem {
  return {
    id: apiCourse.id.toString(),
    title: apiCourse.title || 'Sem título',
    duration: apiCourse.carga_horaria || 0,
    vacancies: apiCourse.numero_vagas || 0,
    status: apiCourse.status as CourseStatus,
    created_at: new Date(apiCourse.created_at),
    registration_start: apiCourse.enrollment_start_date
      ? new Date(apiCourse.enrollment_start_date)
      : null,
    registration_end: apiCourse.enrollment_end_date
      ? new Date(apiCourse.enrollment_end_date)
      : null,
    modalidade: apiCourse.modalidade,
    orgao_id: apiCourse.orgao_id,
    is_external_partner: apiCourse.is_external_partner,
    course_management_type: apiCourse.course_management_type,
    external_partner_name: apiCourse.external_partner_name,
    courseType: deriveCourseType(apiCourse.status),
  }
}

/**
 * Transforms an array of API courses to CourseListItem format
 */
export function transformApiCoursesToCourseListItems(
  apiCourses: ApiCourse[]
): CourseListItem[] {
  return apiCourses.map(transformApiCourseToCourseListItem)
}

/**
 * Maps API status values to display-friendly labels
 */
export function getStatusDisplayLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Rascunho',
    opened: 'Aberto',
    ABERTO: 'Aberto',
    scheduled: 'Agendado',
    accepting_enrollments: 'Recebendo Inscrições',
    in_progress: 'Em Andamento',
    finished: 'Encerrado',
    closed: 'Fechado',
    cancelled: 'Cancelado',
  }

  return statusMap[status] || status
}

/**
 * Maps API modality values to display-friendly labels
 */
export function getModalityDisplayLabel(modality: string): string {
  const modalityMap: Record<string, string> = {
    ONLINE: 'Online',
    PRESENCIAL: 'Presencial',
    LIVRE_FORMACAO_ONLINE: 'Livre formação (online)',
    SEMIPRESENCIAL: 'Semipresencial',
  }

  return modalityMap[modality] || modality
}
