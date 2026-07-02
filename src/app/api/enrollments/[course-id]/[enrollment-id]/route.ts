import { getApiV1CoursesCourseId } from '@/http-gorio/courses/courses'
import { putApiV1CoursesCourseIdEnrollmentsEnrollmentId } from '@/http-gorio/inscricoes/inscricoes'
import {
  convertApiEnrollmentToFrontend,
  unwrapApiInscricao,
} from '@/lib/enrollment-converters'
import { type NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'course-id': string; 'enrollment-id': string }> }
) {
  try {
    const { 'course-id': courseId, 'enrollment-id': enrollmentId } =
      await params

    if (!courseId || !enrollmentId) {
      return NextResponse.json(
        { error: 'Course ID and enrollment ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, phone, email, address, neighborhood, age } = body

    const updateData: Record<string, string | number> = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (address !== undefined) updateData.address = address
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood
    if (age !== undefined) updateData.age = age

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field is required to update' },
        { status: 400 }
      )
    }

    const courseResponse = await getApiV1CoursesCourseId(
      Number.parseInt(courseId, 10)
    )
    const courseCustomFields =
      courseResponse.status === 200
        ? (courseResponse.data as { data?: { custom_fields?: unknown[] } })
            ?.data?.custom_fields || []
        : []

    const response = await putApiV1CoursesCourseIdEnrollmentsEnrollmentId(
      Number.parseInt(courseId, 10),
      enrollmentId,
      updateData
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
        courseCustomFields as Parameters<
          typeof convertApiEnrollmentToFrontend
        >[1]
      )

      return NextResponse.json(updatedEnrollment)
    }

    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return NextResponse.json(
      {
        error: 'Failed to update enrollment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
