import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para listar cursos com status pending_deletion.
 * Usado pela tab "Pendências de exclusão" (visível apenas para Casa Civil).
 */
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
    const page = searchParams.get('page') || '1'
    const perPage = searchParams.get('per_page') || '10'
    const search = searchParams.get('search') || ''

    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

    const params = new URLSearchParams({
      page,
      per_page: perPage,
      status: 'pending_deletion',
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
        { error: 'Erro ao buscar cursos pendentes de exclusão', success: false },
        { status: response.status }
      )
    }

    const data = await response.json()

    let courses: any[] = []
    if (Array.isArray(data?.courses)) {
      courses = data.courses
    } else if (Array.isArray(data?.data?.courses)) {
      courses = data.data.courses
    } else if (Array.isArray(data)) {
      courses = data
    }

    const pagination = data?.pagination || data?.data?.pagination || null

    const transformedCourses: CourseListItem[] = courses.map((course: any) => {
      try {
        return transformApiCourseToCourseListItem(course)
      } catch (error) {
        console.error(
          'Error transforming pending_deletion course:',
          course,
          error
        )
        return {
          id: course.id?.toString() || 'unknown',
          title: course.title || 'Sem título',
          duration: course.carga_horaria || 0,
          vacancies: course.numero_vagas || 0,
          status: course.status || 'pending_deletion',
          originalStatus: course.status || 'pending_deletion',
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
    })

    return NextResponse.json({
      courses: transformedCourses,
      pagination,
      total: pagination?.total || transformedCourses.length,
      page: Number.parseInt(page, 10),
      per_page: Number.parseInt(perPage, 10),
      success: true,
    })
  } catch (error) {
    console.error('Erro ao buscar cursos pendentes de exclusão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}
