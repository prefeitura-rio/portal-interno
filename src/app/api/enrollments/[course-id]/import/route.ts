import { postApiV1CoursesCourseIdEnrollmentsImport } from '@/http-gorio/inscricoes/inscricoes'
import { type NextRequest, NextResponse } from 'next/server'

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and XLSX files are accepted.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Call the API to import enrollments
    const response = await postApiV1CoursesCourseIdEnrollmentsImport(
      Number.parseInt(courseId, 10),
      file
    )

    if (response.status === 202) {
      return NextResponse.json(response.data, { status: 202 })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to import enrollments' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error importing enrollments:', error)
    return NextResponse.json(
      {
        error: 'Failed to import enrollments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
