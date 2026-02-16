import {
  getApiV1CoursesCourseIdEnrollments,
  putApiV1CoursesCourseIdEnrollmentsEnrollmentIdCertificate,
} from '@/http-gorio/inscricoes/inscricoes'
import type {
  ModelsCertificateUpdateRequest,
  ModelsInscricao,
  ModelsStatusInscricao,
} from '@/http-gorio/models'
import type { Enrollment, EnrollmentStatus } from '@/types/course'
import { type NextRequest, NextResponse } from 'next/server'

// Helper function to convert API status to frontend status
function convertApiStatusToFrontend(
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

// Helper function to convert API enrollment to frontend enrollment
function convertApiEnrollmentToFrontend(
  apiEnrollment: ModelsInscricao
): Enrollment {
  // Calculate age from enrolled_at date (rough estimate - ideally should use birth date)
  const enrolledDate = new Date((apiEnrollment.enrolled_at as string) || '')
  const currentYear = new Date().getFullYear()
  const enrolledYear = enrolledDate.getFullYear()
  const estimatedAge = Math.max(18, 30 + (currentYear - enrolledYear)) // Fallback age calculation

  return {
    id: (apiEnrollment.id as string) || '',
    courseId: (apiEnrollment.course_id as number)?.toString() || '',
    candidateName: (apiEnrollment.name as string) || '',
    cpf: (apiEnrollment.cpf as string) || '',
    email: (apiEnrollment.email as string) || undefined,
    phone: (apiEnrollment.phone as string) || '',
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
        // fields is an object where keys are UUIDs and values are objects with {id, title, value, required}
        return Object.entries(fields as Record<string, unknown>).map(
          ([fieldId, fieldData]) => {
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

              title = fieldObj.title || fieldId

              if (fieldObj.value !== undefined && fieldObj.value !== null) {
                if (Array.isArray(fieldObj.value)) {
                  value = fieldObj.value.join(', ')
                } else if (typeof fieldObj.value === 'object') {
                  value = JSON.stringify(fieldObj.value)
                } else {
                  value = String(fieldObj.value)
                }
              }

              required = Boolean(fieldObj.required ?? false)
            } else {
              title = fieldId
              value =
                fieldData !== undefined && fieldData !== null
                  ? Array.isArray(fieldData)
                    ? fieldData.join(', ')
                    : String(fieldData)
                  : ''
              required = false
            }

            return {
              id: fieldId,
              title,
              value,
              required,
            }
          }
        )
      }

      return []
    })(),
    certificateUrl: apiEnrollment.certificate_url as string | undefined,
    personal_info: apiEnrollment.personal_info as any,
    created_at:
      (apiEnrollment.enrolled_at as string) || new Date().toISOString(),
    updated_at:
      (apiEnrollment.updated_at as string) || new Date().toISOString(),
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params
    const { searchParams } = new URL(request.url)
    const enrollmentId = searchParams.get('enrollmentId')

    if (!courseId || !enrollmentId) {
      return NextResponse.json(
        { error: 'Course ID and enrollment ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { certificate_url } = body

    if (certificate_url === undefined) {
      return NextResponse.json(
        { error: 'certificate_url is required' },
        { status: 400 }
      )
    }

    // Prepare certificate update request
    const certificateRequest: ModelsCertificateUpdateRequest = {
      certificate_url: certificate_url || '', // Allow empty string to remove certificate
    }

    // Call the API to update certificate
    const response =
      await putApiV1CoursesCourseIdEnrollmentsEnrollmentIdCertificate(
        Number.parseInt(courseId, 10),
        enrollmentId,
        certificateRequest
      )

    if (response.status === 200) {
      // Get the updated enrollment data
      const enrollmentResponse = await getApiV1CoursesCourseIdEnrollments(
        Number.parseInt(courseId, 10),
        { page: 1, limit: 1000 } // Get all enrollments to find the updated one
      )

      if (enrollmentResponse.status === 200) {
        const apiData = enrollmentResponse.data as any
        if (
          apiData.data?.enrollments &&
          Array.isArray(apiData.data.enrollments)
        ) {
          const updatedApiEnrollment = apiData.data.enrollments.find(
            (e: any) => e.id === enrollmentId
          )

          if (updatedApiEnrollment) {
            const updatedEnrollment =
              convertApiEnrollmentToFrontend(updatedApiEnrollment)
            return NextResponse.json(updatedEnrollment)
          }
        }
      }

      // Fallback: return the enrollment with updated certificate URL
      return NextResponse.json({
        id: enrollmentId,
        courseId,
        certificateUrl: certificate_url,
      })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating certificate:', error)
    return NextResponse.json(
      {
        error: 'Failed to update certificate',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
