import type {
  ModelsInscricao,
  ModelsStatusInscricao,
} from '@/http-gorio/models'
import type { Enrollment, EnrollmentStatus } from '@/types/course'

const INVALID_PLACEHOLDER_EMAILS = ['naotem@email.com', '0@0.aa']

/** Unwraps app-go-api responses that nest the entity under `data`. */
export function unwrapApiInscricao(
  payload: unknown
): ModelsInscricao | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const record = payload as Record<string, unknown>

  if (
    record.data &&
    typeof record.data === 'object' &&
    !Array.isArray(record.data)
  ) {
    return record.data as ModelsInscricao
  }

  if ('id' in record || 'cpf' in record || 'course_id' in record) {
    return record as ModelsInscricao
  }

  return undefined
}

function resolveEnrollmentEmail(
  apiEnrollment: ModelsInscricao
): string | undefined {
  const personalEmail = (apiEnrollment.personal_info as { email?: string })
    ?.email
  const enrollmentEmail = apiEnrollment.email as string | undefined

  if (
    personalEmail &&
    !INVALID_PLACEHOLDER_EMAILS.includes(personalEmail.toLowerCase())
  ) {
    return personalEmail
  }

  return enrollmentEmail || undefined
}

export function convertApiStatusToFrontend(
  status?: ModelsStatusInscricao
): EnrollmentStatus {
  switch (status) {
    case 'approved':
      return 'approved'
    case 'pending':
      return 'pending'
    case 'cancelled':
      return 'cancelled'
    case 'rejected':
      return 'rejected'
    case 'concluded':
      return 'concluded'
    default:
      return 'pending'
  }
}

export function convertFrontendStatusToApi(
  status: EnrollmentStatus
): ModelsStatusInscricao {
  switch (status) {
    case 'approved':
      return 'approved'
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
    case 'concluded':
      return 'concluded'
    default:
      return 'pending'
  }
}

export function convertApiEnrollmentToFrontend(
  apiEnrollment: ModelsInscricao,
  courseCustomFields?: Array<{
    id: string
    title?: string
    name?: string
    required?: boolean
    field_type?: string
    options?: Array<{ id: string; value: string }>
  }>
): Enrollment {
  const converted = {
    id: (apiEnrollment.id as string) || '',
    courseId: (apiEnrollment.course_id as number)?.toString() || '',
    candidateName:
      (apiEnrollment.personal_info as { nome?: string })?.nome ||
      (apiEnrollment.name as string) ||
      '',
    declaredName: (apiEnrollment.name as string) || undefined,
    cpf: (apiEnrollment.cpf as string) || '',
    email: resolveEnrollmentEmail(apiEnrollment),
    declaredEmail: (apiEnrollment.email as string) || undefined,
    phone: (apiEnrollment.phone as string) || '',
    address: (apiEnrollment.address as string) || undefined,
    neighborhood: (apiEnrollment.neighborhood as string) || undefined,
    age: (apiEnrollment.age as number) || undefined,
    enrollmentDate:
      (apiEnrollment.enrolled_at as string) || new Date().toISOString(),
    status: convertApiStatusToFrontend(
      apiEnrollment.status as ModelsStatusInscricao
    ),
    notes: apiEnrollment.admin_notes as string | undefined,
    reason: apiEnrollment.reason as string | undefined,
    customFields: (() => {
      const fields = apiEnrollment.custom_fields as unknown
      if (!fields) {
        return []
      }

      if (Array.isArray(fields)) {
        return fields.map((field, index) => {
          const item = field as {
            id?: string
            title?: string
            value?: unknown
            required?: boolean
          }

          const generatedId =
            item.title?.toLowerCase().replace(/\s+/g, '_') ??
            `custom_field_${index}`

          return {
            id: item.id ?? generatedId,
            title: item.title ?? item.id ?? 'Campo personalizado',
            value:
              item.value !== undefined && item.value !== null
                ? String(item.value)
                : '',
            required: Boolean(item.required),
          }
        })
      }

      if (typeof fields === 'object') {
        const convertedFields = Object.entries(
          fields as Record<string, unknown>
        ).map(([fieldId, fieldData]) => {
          const fieldDefinition = courseCustomFields?.find(
            cf => cf.id === fieldId
          )

          let title = fieldId
          let value = ''
          let required = false

          if (
            fieldData &&
            typeof fieldData === 'object' &&
            !Array.isArray(fieldData)
          ) {
            const fieldObj = fieldData as {
              id?: string
              title?: string
              value?: unknown
              required?: boolean
            }

            title =
              fieldObj.title ||
              fieldDefinition?.title ||
              fieldDefinition?.name ||
              fieldId

            if (fieldObj.value !== undefined && fieldObj.value !== null) {
              if (Array.isArray(fieldObj.value)) {
                value = fieldObj.value.join(', ')
              } else if (typeof fieldObj.value === 'object') {
                value = JSON.stringify(fieldObj.value)
              } else {
                value = String(fieldObj.value)
              }
            }

            required = Boolean(
              fieldObj.required ?? fieldDefinition?.required ?? false
            )
          } else {
            title = fieldDefinition?.title || fieldDefinition?.name || fieldId
            value =
              fieldData !== undefined && fieldData !== null
                ? Array.isArray(fieldData)
                  ? fieldData.join(', ')
                  : String(fieldData)
                : ''
            required = Boolean(fieldDefinition?.required ?? false)
          }

          return {
            id: fieldId,
            title,
            value,
            required,
            field_type: fieldDefinition?.field_type,
            options: fieldDefinition?.options,
          }
        })

        return convertedFields
      }

      return []
    })(),
    personal_info: apiEnrollment.personal_info,
    certificateUrl: apiEnrollment.certificate_url as string | undefined,
    schedule_id: (apiEnrollment as { schedule_id?: string }).schedule_id,
    created_at:
      (apiEnrollment.enrolled_at as string) || new Date().toISOString(),
    updated_at:
      (apiEnrollment.updated_at as string) || new Date().toISOString(),
    enrolled_unit: apiEnrollment.enrolled_unit as Enrollment['enrolled_unit'],
  }

  return converted as Enrollment
}
