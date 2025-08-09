import {
  addEnrollment,
  calculateEnrollmentSummary,
  getEnrollmentsForCourse,
  updateEnrollmentStatus,
} from '@/lib/mock-enrollments'
import type {
  EnrollmentCreateRequest,
  EnrollmentResponse,
  EnrollmentUpdateRequest,
} from '@/types/course'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const perPage = Number.parseInt(searchParams.get('perPage') || '10', 10)
    const status = searchParams.get('status')?.split(',') || undefined
    const search = searchParams.get('search') || undefined
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')
    const ageMin = searchParams.get('ageMin')
    const ageMax = searchParams.get('ageMax')

    // Build filters object
    const filters: any = {}
    if (status) filters.status = status
    if (search) filters.search = search
    if (dateStart && dateEnd) {
      filters.dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd),
      }
    }
    if (ageMin && ageMax) {
      filters.ageRange = {
        min: Number.parseInt(ageMin, 10),
        max: Number.parseInt(ageMax, 10),
      }
    }

    // Get enrollments with pagination and filters
    const { enrollments, total } = getEnrollmentsForCourse(
      courseId,
      page,
      perPage,
      filters
    )

    // Calculate summary
    const summary = calculateEnrollmentSummary(courseId)

    // Build response
    const response: EnrollmentResponse = {
      enrollments,
      summary,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
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
    const body: EnrollmentCreateRequest = await request.json()

    // Validate required fields
    if (
      !body.candidateName ||
      !body.cpf ||
      !body.email ||
      !body.age ||
      !body.phone
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create new enrollment
    const newEnrollment = addEnrollment(courseId, {
      ...body,
      courseId,
      enrollmentDate: new Date().toISOString(),
      status: 'pending',
    })

    return NextResponse.json(newEnrollment, { status: 201 })
  } catch (error) {
    console.error('Error creating enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
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

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      )
    }

    const body: EnrollmentUpdateRequest = await request.json()

    // Update enrollment status
    const updatedEnrollment = updateEnrollmentStatus(
      courseId,
      enrollmentId,
      body.status,
      body.notes
    )

    if (!updatedEnrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedEnrollment)
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: 500 }
    )
  }
}
