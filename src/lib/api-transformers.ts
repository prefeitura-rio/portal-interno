import type { ApiCourse, CourseListItem, CourseStatus } from '@/types/course'

/**
 * Determines the dynamic status for opened/ABERTO courses based on dates
 */
function getDynamicCourseStatus(apiCourse: ApiCourse): CourseStatus {
  // Only apply dynamic status logic for opened/ABERTO courses
  if (apiCourse.status !== 'opened' && apiCourse.status !== 'ABERTO') {
    return apiCourse.status
  }

  const now = new Date()
  const enrollmentStart = apiCourse.enrollment_start_date
    ? new Date(apiCourse.enrollment_start_date)
    : null
  const enrollmentEnd = apiCourse.enrollment_end_date
    ? new Date(apiCourse.enrollment_end_date)
    : null

  // 1. "Agendado" - enrollment hasn't started yet
  if (enrollmentStart && now < enrollmentStart) {
    return 'scheduled' as CourseStatus
  }

  // 2. "Recebendo Inscrições" - currently in enrollment period
  if (
    enrollmentStart &&
    enrollmentEnd &&
    now >= enrollmentStart &&
    now <= enrollmentEnd
  ) {
    return 'accepting_enrollments' as CourseStatus
  }

  // 3. & 4. Check class dates for "Em andamento" or "Encerrado"
  const classStartDates: Date[] = []
  const classEndDates: Date[] = []

  // Handle ONLINE/Remoto courses (remote_class)
  if (
    (apiCourse.modalidade === 'ONLINE' || apiCourse.modalidade === 'Remoto') &&
    (apiCourse as any).remote_class
  ) {
    const remoteClass = (apiCourse as any).remote_class
    if (remoteClass.class_start_date) {
      classStartDates.push(new Date(remoteClass.class_start_date))
    }
    if (remoteClass.class_end_date) {
      classEndDates.push(new Date(remoteClass.class_end_date))
    }
  }

  // Handle PRESENCIAL/Presencial/SEMIPRESENCIAL courses (locations)
  else if (
    (apiCourse.modalidade === 'PRESENCIAL' ||
      apiCourse.modalidade === 'Presencial' ||
      apiCourse.modalidade === 'SEMIPRESENCIAL') &&
    (apiCourse as any).locations
  ) {
    const locations = (apiCourse as any).locations
    if (Array.isArray(locations)) {
      for (const location of locations) {
        if (location.class_start_date) {
          classStartDates.push(new Date(location.class_start_date))
        }
        if (location.class_end_date) {
          classEndDates.push(new Date(location.class_end_date))
        }
      }
    }
  }

  // If we have class dates, determine status based on them
  if (classStartDates.length > 0 && classEndDates.length > 0) {
    // Get the earliest start date and latest end date
    const earliestStart = new Date(
      Math.min(...classStartDates.map(d => d.getTime()))
    )
    const latestEnd = new Date(Math.max(...classEndDates.map(d => d.getTime())))

    // 3. "Em andamento" - currently in class period
    if (now >= earliestStart && now <= latestEnd) {
      return 'in_progress' as CourseStatus
    }

    // 4. "Encerrado" - classes have ended
    if (now > latestEnd) {
      return 'finished' as CourseStatus
    }
  } else {
    // FALLBACK: If class dates are not available in the course list API,
    // use enrollment dates as a proxy for course lifecycle
    if (enrollmentEnd) {
      // If enrollment has ended, consider possible states based on timing
      const daysSinceEnrollmentEnd = Math.floor(
        (now.getTime() - enrollmentEnd.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceEnrollmentEnd > 30) {
        // If enrollment ended more than 30 days ago, likely course is finished
        return 'finished' as CourseStatus
      }
      if (daysSinceEnrollmentEnd >= 0) {
        // If enrollment just ended (0-30 days), likely course is in progress
        return 'in_progress' as CourseStatus
      }
    }
  }

  // Default to opened if no specific condition is met
  return 'opened'
}

/**
 * Transforms an API course response to our frontend CourseListItem format
 */
export function transformApiCourseToCourseListItem(
  apiCourse: ApiCourse
): CourseListItem {
  const originalStatus = apiCourse.status
  const displayStatus = getDynamicCourseStatus(apiCourse)

  return {
    id: apiCourse.id.toString(),
    title: apiCourse.title || 'Sem título',
    provider:
      apiCourse.orgao?.nome || apiCourse.organization || 'Não informado',
    duration: apiCourse.carga_horaria || 0,
    vacancies: apiCourse.numero_vagas || 0,
    status: displayStatus,
    // Store the original status for API operations
    originalStatus: originalStatus,
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
    SEMIPRESENCIAL: 'Semipresencial',
  }

  return modalityMap[modality] || modality
}
