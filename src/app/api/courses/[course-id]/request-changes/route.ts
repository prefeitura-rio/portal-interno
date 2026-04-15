import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * NOVO - Endpoint para solicitar alterações no curso (Casa Civil)
 * Transição: in_review/published → needs_changes
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

    // Chamar backend API
    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL
    const response = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/request-changes`,
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
        {
          error: error.error || 'Erro ao solicitar alterações',
          success: false,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Revalidar cache
    revalidateTag('courses')
    revalidateTag('courses-drafts')

    return NextResponse.json({
      message: 'Solicitação de alterações enviada com sucesso',
      data,
      success: true,
    })
  } catch (error) {
    console.error('Erro ao solicitar alterações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}
