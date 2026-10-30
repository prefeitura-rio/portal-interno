import {
  deleteApiV1CoursesCourseId,
  getApiV1CoursesCourseId,
  putApiV1CoursesCourseId,
} from '@/http-gorio/courses/courses'
import { courseApiErrorMessage } from '@/lib/course-api-error-message'
import {
  canDeleteCourse,
  canUpdateCourseStatus,
  denyCourseCurationAction,
  requestedCourseStatus,
} from '@/lib/course-curation-guard'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
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

    // Use the proper HTTP client function instead of direct fetch
    const response = await getApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )

    if (response.status === 200) {
      // The external API returns { data: ModelsCurso, status: 200 }
      // We need to extract the course data and return it in our format
      const courseData = response.data

      return NextResponse.json({
        course: courseData,
        success: true,
      })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to fetch course from external API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch course',
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
    const numericCourseId = Number.parseInt(courseId, 10)

    // DEV-127: a API de cursos grava o `status` do corpo para qualquer papel
    const requestedStatus = requestedCourseStatus(body)
    if (requestedStatus !== undefined) {
      const denial = await denyCourseCurationAction(
        numericCourseId,
        'PUT status',
        (roles, currentStatus) =>
          canUpdateCourseStatus(roles, currentStatus, requestedStatus)
      )
      if (denial) return denial
    }

    // Use the proper HTTP client function instead of direct fetch
    const response = await putApiV1CoursesCourseId(numericCourseId, body)

    if (response.status === 200) {
      return NextResponse.json({
        course: response.data,
        success: true,
      })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to update course from external API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      {
        error: 'Failed to update course',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const numericCourseId = Number.parseInt(courseId, 10)

    // DEV-127: o Editor só exclui rascunho; `pending_deletion` é da Casa Civil
    const denial = await denyCourseCurationAction(
      numericCourseId,
      'DELETE',
      canDeleteCourse
    )
    if (denial) return denial

    // Use the proper HTTP client function instead of direct fetch
    const response = await deleteApiV1CoursesCourseId(numericCourseId)

    if (response.status === 200) {
      return NextResponse.json({
        message: 'Course deleted successfully',
        data: response.data,
        success: true,
      })
    }

    // Repassa a mensagem da API de cursos para o toast mostrar a causa (DEV-94)
    return NextResponse.json(
      {
        error: courseApiErrorMessage(
          'Failed to delete course from external API',
          response.status,
          response.data
        ),
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete course',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
