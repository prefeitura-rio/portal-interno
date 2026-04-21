import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Endpoint para criar curso e publicar diretamente (Casa Civil).
 * Flow: 1) Cria curso como draft
 *       2) Envia para revisão (draft → in_review)
 *       3) Aprova (in_review → approved)
 *       4) Publica (approved → published)
 */
export async function POST(request: Request) {
  try {
    const body: any = await request.json()

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

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.value}`,
    }

    // Step 1: Create course as draft
    const draftResponse = await fetch(`${baseUrl}/api/v1/courses/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text()
      let errorMessage = 'Erro ao criar rascunho do curso'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {}
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

    // Step 2: Send to review (draft → in_review)
    const reviewResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/send-to-review`,
      { method: 'PUT', headers }
    )

    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text()
      let errorMessage = 'Erro ao enviar curso para revisão'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {}
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

    // Step 3: Approve (in_review → approved)
    const approveResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/approve`,
      { method: 'PUT', headers }
    )

    if (!approveResponse.ok) {
      const errorText = await approveResponse.text()
      let errorMessage = 'Erro ao aprovar curso'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {}
      return NextResponse.json(
        { error: errorMessage, success: false, courseId, step: 'approve' },
        { status: approveResponse.status }
      )
    }

    // Step 4: Publish (approved → published)
    const publishResponse = await fetch(
      `${baseUrl}/api/v1/courses/${courseId}/publish`,
      { method: 'PUT', headers }
    )

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text()
      let errorMessage = 'Erro ao publicar curso'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorMessage
      } catch {}
      return NextResponse.json(
        { error: errorMessage, success: false, courseId, step: 'publish' },
        { status: publishResponse.status }
      )
    }

    const publishResult = await publishResponse.json()

    revalidateTag('courses')
    revalidateTag('courses-drafts')
    revalidateTag('courses-in-review')

    return NextResponse.json({
      course: publishResult.data || publishResult,
      courseId,
      success: true,
    })
  } catch (error) {
    console.error('Error creating and publishing course directly:', error)
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 }
    )
  }
}
