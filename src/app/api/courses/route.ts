import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para listar cursos da tab "Cursos Criados".
 *
 * Busca cursos com status que pertencem a essa tab via fetches paralelos
 * ao backend, evitando filtro client-side que quebrava paginação.
 *
 * Status excluídos (têm tabs dedicadas): draft, in_review, needs_changes.
 */

// Status que pertencem à tab "Cursos Criados"
const CREATED_TAB_STATUSES = [
  'opened',
  'closed',
  'canceled',
  'approved',
  'published',
  'pending_deletion',
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

    // Fetch all statuses in parallel with a high per_page to get all courses,
    // then paginate server-side. This avoids the broken client-side filtering
    // that caused pages to have fewer items than expected.
    const fetchByStatus = (status: string) => {
      const params = new URLSearchParams({
        status,
        page: '1',
        per_page: '500',
        ...(search && { search }),
      })
      return fetch(`${baseUrl}/api/v1/courses?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
        cache: 'no-store',
      })
    }

    const responses = await Promise.all(
      CREATED_TAB_STATUSES.map(fetchByStatus)
    )

    // Extract courses from each response
    const extractCourses = async (res: Response): Promise<any[]> => {
      if (!res.ok) return []
      const data = await res.json()
      if (Array.isArray(data?.courses)) return data.courses
      if (Array.isArray(data?.data?.courses)) return data.data.courses
      if (Array.isArray(data)) return data
      return []
    }

    const coursesArrays = await Promise.all(responses.map(extractCourses))
    const allCourses = coursesArrays.flat()

    // Transform to frontend format
    const transformedCourses: CourseListItem[] = allCourses.map(
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
            originalStatus: course.status || 'opened',
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

    // Sort by created_at descending (newest first)
    transformedCourses.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Server-side pagination
    const total = transformedCourses.length
    const startIndex = (page - 1) * perPage
    const paginatedCourses = transformedCourses.slice(
      startIndex,
      startIndex + perPage
    )

    return NextResponse.json({
      courses: paginatedCourses,
      pagination: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      total,
      page,
      per_page: perPage,
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
