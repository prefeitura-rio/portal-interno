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
    organization: courseData.orgao?.nome || courseData.organization || '',
    provider: courseData.orgao?.nome || courseData.organization || '',
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
    enrollment_start_date:
      safeParseDate(courseData.enrollment_start_date) ||
      safeParseDate(courseData.data_inicio) ||
      new Date(),
    enrollment_end_date:
      safeParseDate(courseData.enrollment_end_date) ||
      safeParseDate(courseData.data_limite_inscricoes) ||
      new Date(),
    workload: courseData.workload || courseData.carga_horaria?.toString() || '',
    duration: courseData.carga_horaria || 0,
    vacancies: courseData.numero_vagas || 0,
    target_audience: courseData.target_audience || '',
    pre_requisitos: courseData.pre_requisitos || courseData.prerequisites || '',
    has_certificate:
      courseData.has_certificate || courseData.certificacao_oferecida || false,
    facilitator: courseData.facilitator || '',
    objectives: courseData.objectives || '',
    expected_results: courseData.expected_results || '',
    program_content: courseData.program_content || '',
    methodology: courseData.methodology || '',
    resources_used: courseData.resources_used || '',
    material_used: courseData.material_used || '',
    teaching_material: courseData.teaching_material || '',
    locations: (courseData.locations || []).map((location: any) => ({
      id: location.id || '',
      address: location.address || '',
      neighborhood: location.neighborhood || '',
      vacancies: location.vacancies || 0,
      class_start_date: safeParseDate(location.class_start_date) || new Date(),
      class_end_date: safeParseDate(location.class_end_date) || new Date(),
      class_time: location.class_time || '',
      class_days: location.class_days || '',
    })),
    institutional_logo: courseData.institutional_logo || '',
    cover_image: courseData.cover_image || '',
    custom_fields: courseData.custom_fields || [],
    remote_class: courseData.remote_class
      ? {
          vacancies: courseData.remote_class.vacancies || 0,
          class_start_date:
            safeParseDate(courseData.remote_class.class_start_date) ||
            new Date(),
          class_end_date:
            safeParseDate(courseData.remote_class.class_end_date) || new Date(),
          class_time: courseData.remote_class.class_time || '',
          class_days: courseData.remote_class.class_days || '',
        }
      : undefined,
    status: courseData.status || 'draft',
    created_at: safeParseDate(courseData.created_at) || new Date(),
    updated_at: safeParseDate(courseData.updated_at) || new Date(),
  }

  console.log('Transformed course data:', transformed)
  return transformed
}
