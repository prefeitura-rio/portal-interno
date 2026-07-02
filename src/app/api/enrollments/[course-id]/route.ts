import { getApiV1CoursesCourseId } from '@/http-gorio/courses/courses'
import {
  getApiV1CoursesCourseIdEnrollments,
  postApiV1CoursesCourseIdEnrollmentsManual,
  putApiV1CoursesCourseIdEnrollmentsEnrollmentIdStatus,
  putApiV1CoursesCourseIdEnrollmentsStatus,
} from '@/http-gorio/inscricoes/inscricoes'
import type {
  ModelsEnrollmentStatusUpdateRequest,
  ModelsInscricao,
} from '@/http-gorio/models'
import {
  convertApiEnrollmentToFrontend,
  convertFrontendStatusToApi,
  unwrapApiInscricao,
} from '@/lib/enrollment-converters'
import type {
  Enrollment,
  EnrollmentResponse,
  EnrollmentStatus,
  EnrollmentSummary,
} from '@/types/course'
import { type NextRequest, NextResponse } from 'next/server'

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

    // Fetch course data to get custom fields definitions
    const courseResponse = await getApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )
    const courseCustomFields =
      courseResponse.status === 200
        ? (courseResponse.data as any)?.data?.custom_fields || []
        : []

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
          (enrollment: ModelsInscricao) =>
            convertApiEnrollmentToFrontend(enrollment, courseCustomFields)
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
        cancelledCount: apiSummary?.cancelled || 0,
        rejectedCount: apiSummary?.rejected || 0,
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

    // Fetch course data to get custom fields definitions
    const courseResponse = await getApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )
    const courseCustomFields =
      courseResponse.status === 200
        ? (courseResponse.data as any)?.data?.custom_fields || []
        : []

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
      const apiEnrollment = unwrapApiInscricao(response.data)
      if (!apiEnrollment) {
        return NextResponse.json(
          { error: 'Invalid enrollment response from external API' },
          { status: 502 }
        )
      }
      const updatedEnrollment = convertApiEnrollmentToFrontend(
        apiEnrollment,
        courseCustomFields
      )

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
    const {
      name,
      cpf,
      age,
      phone,
      email,
      address,
      neighborhood,
      schedule_id,
      custom_fields,
    } = body

    if (!name || !cpf || !age || !phone || !address || !neighborhood) {
      return NextResponse.json(
        {
          error:
            'Required fields: name, cpf, age, phone, address, neighborhood',
        },
        { status: 400 }
      )
    }

    // Prepare enrollment data
    const enrollmentData = {
      name,
      cpf,
      age,
      phone,
      ...(email && { email }), // Only include email if provided
      address,
      neighborhood,
      ...(schedule_id && { schedule_id }), // Only include schedule_id if provided
      ...(custom_fields && { custom_fields }), // Include custom_fields if provided
    }

    // Fetch course data to get custom fields definitions
    const courseResponse = await getApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )
    const courseCustomFields =
      courseResponse.status === 200
        ? (courseResponse.data as any)?.data?.custom_fields || []
        : []

    // Call the API to create manual enrollment
    const response = await postApiV1CoursesCourseIdEnrollmentsManual(
      Number.parseInt(courseId, 10),
      enrollmentData
    )
    if (response.status === 201) {
      const apiEnrollment = unwrapApiInscricao(response.data)
      if (!apiEnrollment) {
        return NextResponse.json(
          { error: 'Invalid enrollment response from external API' },
          { status: 502 }
        )
      }
      const newEnrollment = convertApiEnrollmentToFrontend(
        apiEnrollment,
        courseCustomFields
      )

      return NextResponse.json(newEnrollment, { status: 201 })
    }

    // Handle error responses
    console.error('[Enrollment POST] Backend error response:', response)
    return NextResponse.json(
      {
        error: 'Failed to create manual enrollment',
        backendError: response.data,
        status: response.status,
      },
      { status: response.status }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create manual enrollment',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    )
  }
}
