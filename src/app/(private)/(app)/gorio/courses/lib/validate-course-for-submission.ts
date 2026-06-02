import { fullFormSchema } from '@/app/(private)/(app)/gorio/components/new-course-form'

export type CourseValidationError = {
  field: string
  message: string
}

// Maps a raw API course object (ModelsCurso shape) to the form shape expected by fullFormSchema.
// Mirrors the prepareDefaultValues logic in new-course-form.tsx so validation is consistent.
export function adaptApiCourseToFormShape(
  apiCourse: Record<string, unknown>
): Record<string, unknown> {
  const locations = ((apiCourse.locations as any[]) || []).map(
    (location: any) => {
      if (
        location.schedules &&
        Array.isArray(location.schedules) &&
        location.schedules.length > 0
      ) {
        return {
          id: location.id,
          address: location.address || '',
          neighborhood: location.neighborhood || '',
          zona: location.zona || location.neighborhood_zone || '',
          schedules: location.schedules.map((s: any) => ({
            id: s.id,
            vacancies: s.vacancies,
            classStartDate: s.class_start_date
              ? new Date(s.class_start_date)
              : s.classStartDate
                ? new Date(s.classStartDate)
                : new Date(),
            classEndDate: s.class_end_date
              ? new Date(s.class_end_date)
              : s.classEndDate
                ? new Date(s.classEndDate)
                : new Date(),
            classTime: s.class_time || s.classTime || '',
            classDays: s.class_days || s.classDays || '',
          })),
        }
      }
      return {
        id: location.id,
        address: location.address || '',
        neighborhood: location.neighborhood || '',
        zona: location.zona || '',
        schedules: [
          {
            id: location.schedule_id || '00000000-0000-0000-0000-000000000000',
            vacancies: location.vacancies || 1,
            classStartDate: location.classStartDate
              ? new Date(location.classStartDate)
              : new Date(),
            classEndDate: location.classEndDate
              ? new Date(location.classEndDate)
              : new Date(),
            classTime: location.classTime || '',
            classDays: location.classDays || '',
          },
        ],
      }
    }
  )

  const remoteClassRaw = apiCourse.remote_class as any
  let remote_class: unknown = undefined
  if (remoteClassRaw) {
    if (remoteClassRaw.schedules && Array.isArray(remoteClassRaw.schedules)) {
      remote_class = remoteClassRaw.schedules.map((s: any) => ({
        id: s.id,
        vacancies: s.vacancies,
        classStartDate: s.class_start_date
          ? new Date(s.class_start_date)
          : null,
        classEndDate: s.class_end_date ? new Date(s.class_end_date) : null,
        classTime: s.class_time || null,
        classDays: s.class_days || null,
      }))
    } else {
      // Legacy flat remote_class
      remote_class = [
        {
          id: remoteClassRaw.id,
          vacancies: remoteClassRaw.vacancies,
          classStartDate: remoteClassRaw.class_start_date
            ? new Date(remoteClassRaw.class_start_date)
            : null,
          classEndDate: remoteClassRaw.class_end_date
            ? new Date(remoteClassRaw.class_end_date)
            : null,
          classTime: remoteClassRaw.class_time || null,
          classDays: remoteClassRaw.class_days || null,
        },
      ]
    }
  }

  const categorias = apiCourse.categorias as Array<{ id: number }> | undefined
  const category = Array.isArray(apiCourse.category)
    ? (apiCourse.category as number[])
    : (categorias?.map(c => c.id) ?? [])

  const enrollmentStart = apiCourse.enrollment_start_date
    ? new Date(apiCourse.enrollment_start_date as string)
    : new Date()
  const enrollmentEnd = apiCourse.enrollment_end_date
    ? new Date(apiCourse.enrollment_end_date as string)
    : new Date()

  const managementType =
    (apiCourse.course_management_type as string | undefined) ||
    ((apiCourse.is_external_partner as boolean)
      ? apiCourse.external_partner_url
        ? 'EXTERNAL_MANAGED_BY_PARTNER'
        : 'EXTERNAL_MANAGED_BY_ORG'
      : 'OWN_ORG')

  return {
    modalidade: apiCourse.modalidade,
    title: apiCourse.title || '',
    description: apiCourse.description || '',
    category,
    enrollment_start_date: enrollmentStart,
    enrollment_end_date: enrollmentEnd,
    orgao_id: apiCourse.orgao_id || '',
    workload:
      (apiCourse.carga_horaria as string | undefined) ||
      (apiCourse.workload as string | undefined) ||
      '',
    target_audience:
      (apiCourse.publico_alvo as string | undefined) ||
      (apiCourse.target_audience as string | undefined) ||
      '',
    institutional_logo: apiCourse.institutional_logo || '',
    cover_image: apiCourse.cover_image || '',
    is_visible: (apiCourse.is_visible as boolean | undefined) ?? true,
    formacao_link: (apiCourse.formacao_link as string | undefined) || '',
    locations,
    remote_class,
    course_management_type: managementType,
    external_partner_name:
      (apiCourse.external_partner_name as string | undefined) || '',
    external_partner_url:
      (apiCourse.external_partner_url as string | undefined) || '',
    pre_requisitos: (apiCourse.pre_requisitos as string | undefined) || '',
    has_certificate:
      (apiCourse.has_certificate as boolean | undefined) ?? false,
    auto_approve_enrollments:
      (apiCourse.auto_approve_enrollments as boolean | undefined) ?? false,
    theme: (apiCourse.theme as string | undefined) || 'Curso',
    accessibility: (apiCourse.accessibility as string | undefined) || null,
    facilitator: (apiCourse.facilitator as string | undefined) || '',
    objectives: (apiCourse.objectives as string | undefined) || '',
    expected_results: (apiCourse.expected_results as string | undefined) || '',
    program_content: (apiCourse.program_content as string | undefined) || '',
    methodology: (apiCourse.methodology as string | undefined) || '',
    resources_used: (apiCourse.resources_used as string | undefined) || '',
    material_used: (apiCourse.material_used as string | undefined) || '',
    teaching_material:
      (apiCourse.teaching_material as string | undefined) || '',
    custom_fields: (apiCourse.custom_fields as unknown[] | undefined) || [],
  }
}

export function validateCourseForSubmission(
  apiCourse: Record<string, unknown>
): CourseValidationError[] {
  const formShape = adaptApiCourseToFormShape(apiCourse)
  const result = fullFormSchema.safeParse(formShape)
  if (result.success) return []
  return result.error.issues.map(issue => ({
    field: issue.path.join('.') || issue.code,
    message: issue.message,
  }))
}
