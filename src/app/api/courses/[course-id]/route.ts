import {
  deleteApiV1CoursesCourseId,
  getApiV1CoursesCourseId,
  putApiV1CoursesCourseId,
} from '@/http/courses/courses'
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

    console.log('API Response:', response)
    console.log('API Response data:', response.data)
    console.log('API Response status:', response.status)

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

    // Use the proper HTTP client function instead of direct fetch
    const response = await putApiV1CoursesCourseId(
      Number.parseInt(courseId, 10),
      body
    )

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

    // Use the proper HTTP client function instead of direct fetch
    const response = await deleteApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )

    if (response.status === 200) {
      return NextResponse.json({
        message: 'Course deleted successfully',
        data: response.data,
        success: true,
      })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to delete course from external API' },
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
