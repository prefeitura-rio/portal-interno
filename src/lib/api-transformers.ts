import type { ApiCourse, CourseListItem } from '@/types/course'

/**
 * Transforms an API course response to our frontend CourseListItem format
 */
export function transformApiCourseToCourseListItem(
  apiCourse: ApiCourse
): CourseListItem {
  return {
    id: apiCourse.id.toString(),
    title: apiCourse.title || 'Sem título',
    provider:
      apiCourse.orgao?.nome || apiCourse.organization || 'Não informado',
    duration: apiCourse.carga_horaria || 0,
    vacancies: apiCourse.numero_vagas || 0,
    status: apiCourse.status,
    created_at: new Date(apiCourse.created_at),
    registration_start: apiCourse.enrollment_start_date
      ? new Date(apiCourse.enrollment_start_date)
      : null,
    registration_end: apiCourse.enrollment_end_date
      ? new Date(apiCourse.enrollment_end_date)
      : null,
    modalidade: apiCourse.modalidade,
    organization:
      apiCourse.orgao?.nome || apiCourse.organization || 'Não informado',
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
    SEMIPRESENCIAL: 'Semipresencial',
  }

  return modalityMap[modality] || modality
}
