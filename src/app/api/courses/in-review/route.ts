import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * NOVO - Endpoint para listar cursos em revisão (status: in_review)
 * Útil para Casa Civil visualizar cursos aguardando aprovação
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

    // Chamar backend API com filtro de status
    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL
    const queryParams = new URLSearchParams({
      page,
      per_page: perPage,
      status: 'in_review', // Filtro específico
      ...(search && { search }),
    })

    const response = await fetch(
      `${baseUrl}/api/v1/courses?${queryParams.toString()}`,
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
      const error = await response.json()
      return NextResponse.json(
        {
          error: error.error || 'Erro ao buscar cursos em revisão',
          success: false,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Backend response shape may be flat ({ courses, pagination }) or nested
    // ({ data: { courses, pagination } }). Normalize and transform so the
    // table columns receive CourseListItem objects with the expected fields
    // (registration_start/registration_end, Date instances, etc.).
    let rawCourses: any[] = []
    let pagination: any = null

    if (Array.isArray(data?.courses)) {
      rawCourses = data.courses
    } else if (Array.isArray(data?.data?.courses)) {
      rawCourses = data.data.courses
    } else if (Array.isArray(data)) {
      rawCourses = data
    }

    if (data?.pagination) {
      pagination = data.pagination
    } else if (data?.data?.pagination) {
      pagination = data.data.pagination
    }

    const transformedCourses: CourseListItem[] = rawCourses.map(
      (course: any) => {
        try {
          return transformApiCourseToCourseListItem(course)
        } catch (error) {
          console.error('Error transforming in-review course:', course, error)
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
      pagination,
      total: pagination?.total || transformedCourses.length,
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
