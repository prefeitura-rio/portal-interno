import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para listar cursos no fluxo de curadoria (status: in_review + needs_changes).
 * Ambos os statuses aparecem na tab "Em aprovação" / "Pronto para aprovação".
 */
export async function GET(request: NextRequest) {
  try {
    // Buscar token de autenticação
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Não autenticado', success: false },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const perPage = searchParams.get('per_page') || '10'
    const search = searchParams.get('search') || ''

    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

    // Fetch both in_review and needs_changes in parallel
    const buildParams = (status: string) =>
      new URLSearchParams({
        page,
        per_page: perPage,
        status,
        ...(search && { search }),
      })

    const fetchCoursesByStatus = (status: string) =>
      fetch(`${baseUrl}/api/v1/courses?${buildParams(status).toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
        cache: 'no-store',
      })

    const [inReviewRes, needsChangesRes] = await Promise.all([
      fetchCoursesByStatus('in_review'),
      fetchCoursesByStatus('needs_changes'),
    ])

    const extractCourses = async (res: Response): Promise<any[]> => {
      if (!res.ok) return []
      const data = await res.json()
      if (Array.isArray(data?.courses)) return data.courses
      if (Array.isArray(data?.data?.courses)) return data.data.courses
      if (Array.isArray(data)) return data
      return []
    }

    const [inReviewCourses, needsChangesCourses] = await Promise.all([
      extractCourses(inReviewRes),
      extractCourses(needsChangesRes),
    ])

    const allRawCourses = [...inReviewCourses, ...needsChangesCourses]

    const transformedCourses: CourseListItem[] = allRawCourses.map(
      (course: any) => {
        try {
          return transformApiCourseToCourseListItem(course)
        } catch (error) {
          console.error(
            'Error transforming in-review/needs-changes course:',
            course,
            error
          )
          return {
            id: course.id?.toString() || 'unknown',
            title: course.title || 'Sem título',
            duration: course.carga_horaria || 0,
            vacancies: course.numero_vagas || 0,
            status: course.status || 'in_review',
            originalStatus: course.status || 'in_review',
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

    return NextResponse.json({
      courses: transformedCourses,
      total: transformedCourses.length,
      page: Number.parseInt(page, 10),
      per_page: Number.parseInt(perPage, 10),
      success: true,
    })
  } catch (error) {
    console.error('Erro ao buscar cursos em revisão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}
