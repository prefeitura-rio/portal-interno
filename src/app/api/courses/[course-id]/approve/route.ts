import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Verifica se alguma turma do curso tem class_start_date anterior ao enrollment_start_date.
 * Retorna uma mensagem de erro ou null se as datas estiverem consistentes.
 */
function validateCourseDates(courseData: any): string | null {
  const enrollmentStart = courseData?.enrollment_start_date
  if (!enrollmentStart) return null

  const enrollmentStartDate = new Date(enrollmentStart)
  if (Number.isNaN(enrollmentStartDate.getTime())) return null

  // PRESENCIAL: locations[].schedules[].class_start_date
  const locations: any[] = courseData?.locations ?? []
  for (const location of locations) {
    for (const schedule of location?.schedules ?? []) {
      if (schedule?.class_start_date) {
        const classStart = new Date(schedule.class_start_date)
        if (!Number.isNaN(classStart.getTime()) && classStart < enrollmentStartDate) {
          return 'A data de início das aulas deve ser igual ou posterior ao início das inscrições.'
        }
      }
    }
  }

  // ONLINE: remote_class pode ser array ou objeto com .schedules
  const remoteClass = courseData?.remote_class
  if (Array.isArray(remoteClass)) {
    for (const schedule of remoteClass) {
      if (schedule?.class_start_date) {
        const classStart = new Date(schedule.class_start_date)
        if (!Number.isNaN(classStart.getTime()) && classStart < enrollmentStartDate) {
          return 'A data de início das aulas deve ser igual ou posterior ao início das inscrições.'
        }
      }
    }
  } else if (remoteClass?.schedules) {
    for (const schedule of remoteClass.schedules) {
      if (schedule?.class_start_date) {
        const classStart = new Date(schedule.class_start_date)
        if (!Number.isNaN(classStart.getTime()) && classStart < enrollmentStartDate) {
          return 'A data de início das aulas deve ser igual ou posterior ao início das inscrições.'
        }
      }
    }
  }

  return null
}

/**
 * NOVO - Endpoint para aprovar curso (Casa Civil)
 * Transição: in_review → approved
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params

    // Buscar token de autenticação
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Não autenticado', success: false },
        { status: 401 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

    // Buscar dados atuais do curso para validar datas antes de aprovar
    const courseResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
      }
    )

    if (courseResponse.ok) {
      const courseResult = await courseResponse.json()
      const courseData = courseResult?.data ?? courseResult
      const dateError = validateCourseDates(courseData)
      if (dateError) {
        return NextResponse.json(
          { error: dateError, success: false },
          { status: 422 }
        )
      }
    }

    // Chamar backend API
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/approve`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error || 'Erro ao aprovar curso', success: false },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Revalidar cache
    revalidateTag('courses')
    revalidateTag('courses-drafts')

    return NextResponse.json({
      message: 'Curso aprovado com sucesso',
      data,
      success: true,
    })
  } catch (error) {
    console.error('Erro ao aprovar curso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}
