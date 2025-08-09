import { mockCourseList } from '@/lib/mock-data'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Convert Date objects to ISO strings for JSON serialization
    const coursesWithStringDates = mockCourseList.map(course => ({
      ...course,
      created_at: course.created_at.toISOString(),
      registration_start: course.registration_start.toISOString(),
      registration_end: course.registration_end.toISOString(),
    }))
    
    return NextResponse.json(coursesWithStringDates)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
