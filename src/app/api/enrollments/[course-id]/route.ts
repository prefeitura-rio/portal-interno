import {
  getApiV1CoursesCourseIdEnrollments,
  postApiV1CoursesCourseIdEnrollmentsManual,
  putApiV1CoursesCourseIdEnrollmentsEnrollmentIdStatus,
  putApiV1CoursesCourseIdEnrollmentsStatus,
} from '@/http-gorio/inscricoes/inscricoes'
import type {
  ModelsEnrollmentStatusUpdateRequest,
  ModelsInscricao,
  ModelsStatusInscricao,
} from '@/http-gorio/models'
import type {
  Enrollment,
  EnrollmentResponse,
  EnrollmentStatus,
  EnrollmentSummary,
} from '@/types/course'
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

// Helper function to convert frontend status to API status
function convertFrontendStatusToApi(
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

// Helper function to convert API enrollment to frontend enrollment
function convertApiEnrollmentToFrontend(
  apiEnrollment: ModelsInscricao
): Enrollment {
  // Calculate age from enrolled_at date (rough estimate - ideally should use birth date)
  console.log('📋 API Enrollment Data:', JSON.stringify(apiEnrollment, null, 2))

  const enrolledDate = new Date((apiEnrollment.enrolled_at as string) || '')
  const currentYear = new Date().getFullYear()
  const enrolledYear = enrolledDate.getFullYear()
  const estimatedAge = Math.max(18, 30 + (currentYear - enrolledYear)) // Fallback age calculation

  return {
    id: (apiEnrollment.id as string) || '',
    courseId: (apiEnrollment.course_id as number)?.toString() || '',
    candidateName: (apiEnrollment.name as string) || '',
    cpf: (apiEnrollment.cpf as string) || '',
    email: (apiEnrollment.email as string) || '',
    phone: (apiEnrollment.phone as string) || '',
    enrollmentDate:
      (apiEnrollment.enrolled_at as string) || new Date().toISOString(),
    status: convertApiStatusToFrontend(
      apiEnrollment.status as ModelsStatusInscricao
    ),
    notes: apiEnrollment.admin_notes as string | undefined,
    reason: apiEnrollment.reason as string | undefined,
    customFields:
      apiEnrollment.custom_fields &&
      typeof apiEnrollment.custom_fields === 'object' &&
      !Array.isArray(apiEnrollment.custom_fields)
        ? Object.entries(
            apiEnrollment.custom_fields as Record<string, any>
          ).map(([key, value]) => ({
            id: key.toLowerCase().replace(/\s+/g, '_'),
            title: key,
            value: String(value),
            required: false,
          }))
        : [],
    certificateUrl: apiEnrollment.certificate_url as string | undefined,
    created_at:
      (apiEnrollment.enrolled_at as string) || new Date().toISOString(),
    updated_at:
      (apiEnrollment.updated_at as string) || new Date().toISOString(),
    schedule_id: (apiEnrollment.schedule_id as string) || undefined,
    enrolled_unit: apiEnrollment.enrolled_unit as any,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params
    const { searchParams } = new URL(request.url)

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Extract query parameters
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('perPage') || '10', 10)
    const statusParam = searchParams.get('status')
    const search = searchParams.get('search') || undefined

    // Handle single status parameter
    let status: string | undefined = undefined
    if (statusParam && statusParam.trim() !== '') {
      // Convert frontend status to API status
      switch (statusParam.trim()) {
        case 'approved':
          status = 'approved'
          break
        case 'pending':
          status = 'pending'
          break
        case 'rejected':
          status = 'rejected'
          break
        case 'cancelled':
          status = 'cancelled'
          break
        default:
          status = statusParam.trim()
      }
    }

    // Call the API
    const response = await getApiV1CoursesCourseIdEnrollments(
      Number.parseInt(courseId, 10),
      {
        page,
        limit,
        status,
        search,
      }
    )

    if (response.status === 200) {
      const apiData = response.data as any

      // Extract enrollments from the nested response structure
      let enrollments: Enrollment[] = []
      let pagination = {
        page,
        perPage: limit,
        total: 0,
        totalPages: 0,
      }

      // The API returns data in data.enrollments format
      if (
        apiData.data?.enrollments &&
        Array.isArray(apiData.data.enrollments)
      ) {
        enrollments = apiData.data.enrollments.map(
          convertApiEnrollmentToFrontend
        )
      }

      // Extract pagination info from data.pagination
      if (apiData.data?.pagination) {
        const apiPagination = apiData.data.pagination
        pagination = {
          page: apiPagination.page || page,
          perPage: apiPagination.limit || limit,
          total: apiPagination.total || enrollments.length,
          totalPages:
            apiPagination.total_pages || Math.ceil(enrollments.length / limit),
        }
      } else {
        pagination.total = enrollments.length
        pagination.totalPages = Math.ceil(enrollments.length / limit)
      }

      // Calculate summary from data.summary
      const apiSummary = apiData.data?.summary
      const summary: EnrollmentSummary = {
        totalVacancies: apiSummary?.total || 100, // Use total from API
        confirmedCount: apiSummary?.approved || 0,
        pendingCount: apiSummary?.pending || 0,
        // cancelledCount:
        //   (apiSummary?.cancelled || 0) + (apiSummary?.rejected || 0),
        cancelledCount: apiSummary?.rejected || 0,
        concludedCount: apiSummary?.concluded || 0,
        remainingVacancies: Math.max(
          0,
          (apiSummary?.total || 100) - (apiSummary?.approved || 0)
        ),
      }

      const responseData: EnrollmentResponse = {
        enrollments,
        summary,
        pagination,
      }

      return NextResponse.json(responseData)
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to fetch enrollments from external API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch enrollments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { status, notes } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Convert frontend status to API status
    const apiStatus = convertFrontendStatusToApi(status as EnrollmentStatus)

    // Call the API to update individual enrollment status
    const response = await putApiV1CoursesCourseIdEnrollmentsEnrollmentIdStatus(
      Number.parseInt(courseId, 10),
      enrollmentId,
      {
        status: apiStatus,
        admin_notes: notes,
        reason: notes,
      } as any
    )

    if (response.status === 200) {
      const apiEnrollment = response.data as ModelsInscricao
      const updatedEnrollment = convertApiEnrollmentToFrontend(apiEnrollment)

      return NextResponse.json(updatedEnrollment)
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to update enrollment status' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating enrollment status:', error)
    return NextResponse.json(
      {
        error: 'Failed to update enrollment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { enrollmentIds, status, notes } = body

    if (!enrollmentIds || !Array.isArray(enrollmentIds) || !status) {
      return NextResponse.json(
        { error: 'Enrollment IDs array and status are required' },
        { status: 400 }
      )
    }

    // Convert frontend status to API status
    const apiStatus = convertFrontendStatusToApi(status as EnrollmentStatus)

    // Prepare bulk update request
    const updateRequest: ModelsEnrollmentStatusUpdateRequest = {
      enrollment_ids: enrollmentIds,
      status: apiStatus,
      admin_notes: notes,
      reason: notes,
    }

    // Call the API to update multiple enrollment statuses
    const response = await putApiV1CoursesCourseIdEnrollmentsStatus(
      Number.parseInt(courseId, 10),
      updateRequest
    )

    if (response.status === 200) {
      return NextResponse.json({
        success: true,
        updatedCount: enrollmentIds.length,
        message: 'Enrollment statuses updated successfully',
      })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to update enrollment statuses' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating enrollment statuses:', error)
    return NextResponse.json(
      {
        error: 'Failed to update enrollment statuses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, cpf, age, phone, email, address, neighborhood } = body

    if (
      !name ||
      !cpf ||
      !age ||
      !phone ||
      !email ||
      !address ||
      !neighborhood
    ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Call the API to create manual enrollment
    const response = await postApiV1CoursesCourseIdEnrollmentsManual(
      Number.parseInt(courseId, 10),
      {
        name,
        cpf,
        age,
        phone,
        email,
        address,
        neighborhood,
      }
    )

    if (response.status === 201) {
      const apiEnrollment = response.data as ModelsInscricao
      const newEnrollment = convertApiEnrollmentToFrontend(apiEnrollment)

      return NextResponse.json(newEnrollment, { status: 201 })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to create manual enrollment' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating manual enrollment:', error)
    return NextResponse.json(
      {
        error: 'Failed to create manual enrollment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
