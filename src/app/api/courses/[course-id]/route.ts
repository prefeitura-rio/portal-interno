import { getCourseById } from '@/lib/mock-data'
import { type NextRequest, NextResponse } from 'next/server'

// Helper function to convert Date objects to ISO strings recursively
function convertDatesToStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (Array.isArray(obj)) {
    return obj.map(convertDatesToStrings)
  }

  if (typeof obj === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesToStrings(value)
    }
    return converted
  }

  return obj
}

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

    const course = getCourseById(courseId)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Convert Date objects to ISO strings for JSON serialization
    const courseWithStringDates = convertDatesToStrings(course)

    return NextResponse.json(courseWithStringDates)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
