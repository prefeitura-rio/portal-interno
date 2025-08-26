import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { 'course-id': string } }
) {
  try {
    const courseId = params['course-id']

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/v1/courses/${courseId}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      course: data.data,
      success: true,
    })
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
  { params }: { params: { 'course-id': string } }
) {
  try {
    const courseId = params['course-id']

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/v1/courses/${courseId}`

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      course: data.data,
      success: true,
    })
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
  { params }: { params: { 'course-id': string } }
) {
  try {
    const courseId = params['course-id']

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/v1/courses/${courseId}`

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      message: 'Course deleted successfully',
      data: data.data,
      success: true,
    })
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
