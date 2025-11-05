import type { CourseStatus } from '@/types/course'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert string dates to Date objects
export function convertDatesToObjects(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(convertDatesToObjects)
  }

  if (typeof data === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        // Check if it looks like a date string (ISO format)
        try {
          converted[key] = new Date(value)
        } catch {
          converted[key] = value
        }
      } else if (typeof value === 'object') {
        converted[key] = convertDatesToObjects(value)
      } else {
        converted[key] = value
      }
    }
    return converted
  }

  return data
}

// Helper function to safely parse dates
function safeParseDate(dateString: any): Date | null {
  if (!dateString || dateString === null || dateString === undefined) {
    return null
  }

  try {
    const date = new Date(dateString)

    // Check if the date is valid
    if (Number.isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return null
    }

    return date
  } catch (error) {
    console.warn('Error parsing date:', dateString, error)
    return null
  }
}

/**
 * Determines the dynamic status for opened/ABERTO courses based on dates
 */
function getDynamicCourseStatus(courseData: any): CourseStatus {
  // Only apply dynamic status logic for opened/ABERTO courses
  if (courseData.status !== 'opened' && courseData.status !== 'ABERTO') {
    return courseData.status
  }

  const now = new Date()
  const enrollmentStart = safeParseDate(courseData.enrollment_start_date)
  const enrollmentEnd = safeParseDate(courseData.enrollment_end_date)

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
    (courseData.modalidade === 'ONLINE' ||
      courseData.modalidade === 'Remoto') &&
    courseData.remote_class
  ) {
    const remoteClass = courseData.remote_class
    const startDate = safeParseDate(remoteClass.class_start_date)
    const endDate = safeParseDate(remoteClass.class_end_date)
    if (startDate) classStartDates.push(startDate)
    if (endDate) classEndDates.push(endDate)
  }

  // Handle PRESENCIAL/Presencial/SEMIPRESENCIAL courses (locations)
  else if (
    (courseData.modalidade === 'PRESENCIAL' ||
      courseData.modalidade === 'Presencial' ||
      courseData.modalidade === 'SEMIPRESENCIAL') &&
    courseData.locations
  ) {
    const locations = courseData.locations
    if (Array.isArray(locations)) {
      for (const location of locations) {
        const startDate = safeParseDate(location.class_start_date)
        const endDate = safeParseDate(location.class_end_date)
        if (startDate) classStartDates.push(startDate)
        if (endDate) classEndDates.push(endDate)
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
    // FALLBACK: If class dates are not available,
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

// Helper function to transform API course data to frontend Course type
export function transformApiCourseToCourse(apiCourse: any): any {
  if (!apiCourse) return apiCourse

  console.log('Transforming course data:', apiCourse)

  // Extract the actual course data from the nested structure
  const courseData = apiCourse.data || apiCourse

  const transformed = {
    id: courseData.id?.toString() || '',
    title: courseData.title || '',
    description: courseData.description || '',
    categorias: courseData.categorias || [],
    provider: courseData.orgao?.nome || courseData.organization || '',
    theme: courseData.theme || '',
    modalidade: (() => {
      const modalidade =
        courseData.modalidade?.nome || courseData.modalidade || ''
      // Map API modalidade values to frontend expected values
      if (modalidade === 'Presencial' || modalidade === 'PRESENCIAL')
        return 'PRESENCIAL'
      if (modalidade === 'Remoto' || modalidade === 'ONLINE') return 'ONLINE'
      if (modalidade === 'Semipresencial' || modalidade === 'HIBRIDO')
        return 'HIBRIDO'
      return modalidade
    })(),
    orgao: courseData.orgao || null,
    orgao_id: courseData.orgao_id || courseData.orgao?.id || null,
    // Ensure organization field is properly mapped from orgao.nome or existing organization
    organization: courseData.orgao?.nome || courseData.organization || '',
    // External partner fields
    is_external_partner: courseData.is_external_partner || false,
    external_partner_name: courseData.external_partner_name || '',
    external_partner_url: courseData.external_partner_url || '',
    external_partner_logo_url: courseData.external_partner_logo_url || '',
    external_partner_contact: courseData.external_partner_contact || '',
    enrollment_start_date:
      safeParseDate(courseData.enrollment_start_date) ||
      safeParseDate(courseData.data_inicio) ||
      new Date(),
    enrollment_end_date:
      safeParseDate(courseData.enrollment_end_date) ||
      safeParseDate(courseData.data_limite_inscricoes) ||
      new Date(),
    // Map enrollment dates to the expected property names in Course interface
    enrollmentStartDate:
      safeParseDate(courseData.enrollment_start_date) ||
      safeParseDate(courseData.data_inicio) ||
      new Date(),
    enrollmentEndDate:
      safeParseDate(courseData.enrollment_end_date) ||
      safeParseDate(courseData.data_limite_inscricoes) ||
      new Date(),
    workload: courseData.workload || courseData.carga_horaria?.toString() || '',
    duration: courseData.carga_horaria || 0,
    vacancies: courseData.numero_vagas || 0,
    target_audience: courseData.target_audience || '',
    targetAudience: courseData.target_audience || '',
    pre_requisitos: courseData.pre_requisitos || courseData.prerequisites || '',
    prerequisites: courseData.pre_requisitos || courseData.prerequisites || '',
    has_certificate:
      courseData.has_certificate || courseData.certificacao_oferecida || false,
    hasCertificate:
      courseData.has_certificate || courseData.certificacao_oferecida || false,
    accessibility: courseData.accessibility || '',
    facilitator: courseData.facilitator || '',
    objectives: courseData.objectives || '',
    expected_results: courseData.expected_results || '',
    expectedResults: courseData.expected_results || '',
    program_content: courseData.program_content || '',
    programContent: courseData.program_content || '',
    methodology: courseData.methodology || '',
    resources_used: courseData.resources_used || '',
    resourcesUsed: courseData.resources_used || '',
    material_used: courseData.material_used || '',
    materialUsed: courseData.material_used || '',
    teaching_material: courseData.teaching_material || '',
    teachingMaterial: courseData.teaching_material || '',
    locations: (courseData.locations || []).map((location: any) => {
      // Handle both new format (with schedules) and old format (backward compatibility)
      const hasSchedules =
        location.schedules && Array.isArray(location.schedules)

      if (hasSchedules) {
        // New format with schedules
        return {
          id: location.id || '',
          address: location.address || '',
          neighborhood: location.neighborhood || '',
          schedules: location.schedules.map((schedule: any) => ({
            vacancies: schedule.vacancies || 0,
            classStartDate:
              safeParseDate(schedule.class_start_date) || new Date(),
            classEndDate: safeParseDate(schedule.class_end_date) || new Date(),
            classTime: schedule.class_time || '',
            classDays: schedule.class_days || '',
          })),
        }
      }
      // Old format - convert to new format with a single schedule
      return {
        id: location.id || '',
        address: location.address || '',
        neighborhood: location.neighborhood || '',
        schedules: [
          {
            vacancies: location.vacancies || 0,
            classStartDate:
              safeParseDate(location.class_start_date) || new Date(),
            classEndDate: safeParseDate(location.class_end_date) || new Date(),
            classTime: location.class_time || '',
            classDays: location.class_days || '',
          },
        ],
      }
    }),
    institutional_logo: courseData.institutional_logo || '',
    institutionalLogo: courseData.institutional_logo || '',
    cover_image: courseData.cover_image || '',
    is_visible: courseData.is_visible ?? true,
    coverImage: courseData.cover_image || '',
    custom_fields: courseData.custom_fields || [],
    customFields: courseData.custom_fields || [],
    remote_class: courseData.remote_class
      ? {
          vacancies: courseData.remote_class.vacancies || 0,
          classStartDate:
            safeParseDate(courseData.remote_class.class_start_date) ||
            new Date(),
          classEndDate:
            safeParseDate(courseData.remote_class.class_end_date) || new Date(),
          classTime: courseData.remote_class.class_time || '',
          classDays: courseData.remote_class.class_days || '',
        }
      : undefined,
    status: getDynamicCourseStatus(courseData),
    originalStatus: courseData.status,
    created_at: safeParseDate(courseData.created_at) || new Date(),
    updated_at: safeParseDate(courseData.updated_at) || new Date(),
  }

  console.log('Transformed course data:', transformed)
  return transformed
}
