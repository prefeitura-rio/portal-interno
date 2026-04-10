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

    return NextResponse.json({
      ...data,
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
