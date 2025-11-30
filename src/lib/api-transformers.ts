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

  // Handle LIVRE_FORMACAO_ONLINE: use enrollment end date to determine status
  if (apiCourse.modalidade === 'LIVRE_FORMACAO_ONLINE') {
    if (enrollmentEnd) {
      // After enrollment end date, show as in progress (course continues to be available)
      if (now > enrollmentEnd) {
        return 'in_progress' as CourseStatus
      }
    }
    // If no enrollment end date or still in enrollment period, continue with normal flow
  }

  // 3. & 4. Check class dates for "Em andamento" or "Encerrado"
  const classStartDates: Date[] = []
  const classEndDates: Date[] = []

  // Handle ONLINE/Remoto courses (remote_class) - can have multiple schedules
  if (
    (apiCourse.modalidade === 'ONLINE' || apiCourse.modalidade === 'Remoto') &&
    (apiCourse as any).remote_class
  ) {
    const remoteClass = (apiCourse as any).remote_class
    // New format: multiple schedules in remote_class.schedules[]
    if (remoteClass.schedules && Array.isArray(remoteClass.schedules)) {
      for (const schedule of remoteClass.schedules) {
        if (schedule.class_start_date) {
          classStartDates.push(new Date(schedule.class_start_date))
        }
        if (schedule.class_end_date) {
          classEndDates.push(new Date(schedule.class_end_date))
        }
      }
    }
    // Backward compatibility: old format with dates directly on remote_class
    else {
      if (remoteClass.class_start_date) {
        classStartDates.push(new Date(remoteClass.class_start_date))
      }
      if (remoteClass.class_end_date) {
        classEndDates.push(new Date(remoteClass.class_end_date))
      }
    }
  }

  // Handle PRESENCIAL/Presencial courses (locations)
  else if (
    (apiCourse.modalidade === 'PRESENCIAL' ||
      apiCourse.modalidade === 'Presencial') &&
    (apiCourse as any).locations
  ) {
    const locations = (apiCourse as any).locations
    if (Array.isArray(locations)) {
      for (const location of locations) {
        // New format: dates are in location.schedules[]
        if (location.schedules && Array.isArray(location.schedules)) {
          for (const schedule of location.schedules) {
            if (schedule.class_start_date) {
              classStartDates.push(new Date(schedule.class_start_date))
            }
            if (schedule.class_end_date) {
              classEndDates.push(new Date(schedule.class_end_date))
            }
          }
        }
        // Backward compatibility: old format with dates directly on location
        else {
          if (location.class_start_date) {
            classStartDates.push(new Date(location.class_start_date))
          }
          if (location.class_end_date) {
            classEndDates.push(new Date(location.class_end_date))
          }
        }
      }
    }
  }

  // If we have class dates, determine status based on them
  if (classStartDates.length > 0 && classEndDates.length > 0) {
    // Get the earliest start date and latest end date (considering all schedules/turmas)
    const earliestStart = new Date(
      Math.min(...classStartDates.map(d => d.getTime()))
    )
    const latestEnd = new Date(Math.max(...classEndDates.map(d => d.getTime())))

    // 3. "Em andamento" - currently in class period
    if (now >= earliestStart && now <= latestEnd) {
      return 'in_progress' as CourseStatus
    }

    // 4. "Encerrado" - classes have ended (using the latest end date from all schedules)
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
    orgao_id: apiCourse.orgao_id,
    // Include external partner info if available (for potential future use)
    is_external_partner: apiCourse.is_external_partner,
    external_partner_name: apiCourse.external_partner_name,
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
