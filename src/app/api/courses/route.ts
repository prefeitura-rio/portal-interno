import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

const CREATED_TAB_STATUSES = [
  'opened',
  'closed',
  'canceled',
  'approved',
  'published',
  'pending_deletion',
  'scheduled',
  'accepting_enrollments',
  'in_progress',
  'finished',
]

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Não autenticado', success: false },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const perPage = Number.parseInt(searchParams.get('per_page') || '10', 10)
    const search = searchParams.get('search') || ''

    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

    const params = new URLSearchParams({
      status: CREATED_TAB_STATUSES.join(','),
      page: page.toString(),
      limit: perPage.toString(),
      ...(search && { search }),
    })

    const response = await fetch(
      `${baseUrl}/api/v1/courses?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const rawCourses: any[] = data?.data?.courses ?? data?.courses ?? []
    const apiPagination = data?.data?.pagination ?? data?.pagination ?? {}

    const transformedCourses: CourseListItem[] = rawCourses.map(
      (course: any) => {
        try {
          return transformApiCourseToCourseListItem(course)
        } catch (error) {
          console.error('Error transforming course:', course, error)
          return {
            id: course.id?.toString() || 'unknown',
            title: course.title || 'Sem título',
            duration: course.carga_horaria || 0,
            vacancies: course.numero_vagas || 0,
            status: course.status || 'opened',
            created_at: new Date(course.created_at || Date.now()),
            registration_start: course.enrollment_start_date
              ? new Date(course.enrollment_start_date)
              : null,
            registration_end: course.enrollment_end_date
              ? new Date(course.enrollment_end_date)
              : null,
            modalidade: course.modalidade || 'PRESENCIAL',
            orgao_id: course.orgao_id || null,
            is_external_partner: course.is_external_partner,
            course_management_type: course.course_management_type,
            external_partner_name: course.external_partner_name,
          } as CourseListItem
        }
      }
    )

    const total = apiPagination.total ?? 0
    const totalPages =
      apiPagination.total_pages ?? Math.ceil(total / perPage)

    return NextResponse.json({
      courses: transformedCourses,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: totalPages,
      },
      total,
      success: true,
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
