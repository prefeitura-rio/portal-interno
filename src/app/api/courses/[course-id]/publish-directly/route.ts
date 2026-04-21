import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint para publicar um curso draft diretamente (Casa Civil).
 * Flow: 1) Envia para revisão (draft → in_review)
 *       2) Aprova (in_review → approved)
 *       3) Publica (approved → published)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Não autenticado', success: false },
        { status: 401 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'URL da API de cursos não configurada', success: false },
        { status: 500 }
      )
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.value}`,
    }

    // Step 1: Send to review (draft → in_review)
    const reviewResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/send-to-review`,
      { method: 'PUT', headers }
    )

    if (!reviewResponse.ok) {
      const error = await reviewResponse.json()
      return NextResponse.json(
        {
          error: error.error || 'Erro ao enviar curso para revisão',
          success: false,
        },
        { status: reviewResponse.status }
      )
    }

    // Step 2: Approve (in_review → approved)
    const approveResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/approve`,
      { method: 'PUT', headers }
    )

    if (!approveResponse.ok) {
      const error = await approveResponse.json()
      return NextResponse.json(
        { error: error.error || 'Erro ao aprovar curso', success: false },
        { status: approveResponse.status }
      )
    }

    // Step 3: Publish (approved → published)
    const publishResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/publish`,
      { method: 'PUT', headers }
    )

    if (!publishResponse.ok) {
      const error = await publishResponse.json()
      return NextResponse.json(
        { error: error.error || 'Erro ao publicar curso', success: false },
        { status: publishResponse.status }
      )
    }

    const data = await publishResponse.json()

    revalidateTag('courses')
    revalidateTag('courses-drafts')
    revalidateTag('courses-in-review')

    return NextResponse.json({
      message: 'Curso publicado com sucesso',
      data,
      success: true,
    })
  } catch (error) {
    console.error('Erro ao publicar curso diretamente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', success: false },
      { status: 500 }
    )
  }
}
