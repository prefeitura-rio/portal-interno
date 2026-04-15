import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Endpoint para criar curso como draft e enviar para revisão
 * Flow: 1) Cria curso com status "draft"
 *       2) Envia para revisão (draft -> in_review)
 */
export async function POST(request: Request) {
  try {
    const body: any = await request.json()

    // Validate required fields
    if (!body.title || !body.orgao_id) {
      return NextResponse.json(
        { error: 'Title and orgao_id are required' },
        { status: 400 }
      )
    }

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

    // Step 1: Create course as draft
    const draftResponse = await fetch(`${baseUrl}/api/v1/courses/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.value}`,
      },
      body: JSON.stringify(body),
    })

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text()
      let errorMessage = 'Erro ao criar rascunho do curso'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      return NextResponse.json(
        { error: errorMessage, success: false },
        { status: draftResponse.status }
      )
    }

    const draftResult = await draftResponse.json()
    const courseId = draftResult.data?.id || draftResult.id

    if (!courseId) {
      return NextResponse.json(
        { error: 'ID do curso não retornado após criação', success: false },
        { status: 500 }
      )
    }

    // Step 2: Send to review (draft -> in_review)
    const reviewResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/send-to-review`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
      }
    )

    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text()
      let errorMessage = 'Erro ao enviar curso para revisão'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      return NextResponse.json(
        {
          error: errorMessage,
          success: false,
          courseId,
          step: 'send-to-review',
        },
        { status: reviewResponse.status }
      )
    }

    const reviewResult = await reviewResponse.json()

    // Revalidate courses cache
    revalidateTag('courses')
    revalidateTag('courses-drafts')
    revalidateTag('courses-in-review')

    return NextResponse.json({
      course: reviewResult.data || reviewResult,
      courseId: courseId,
      success: true,
    })
  } catch (error) {
    console.error('Error creating course and sending to review:', error)
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    )
  }
}
