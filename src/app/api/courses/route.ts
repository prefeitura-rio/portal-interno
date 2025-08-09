import { mockCourseList } from '@/lib/mock-data'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json(mockCourseList)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
