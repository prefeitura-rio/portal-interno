// LEGADO - Este endpoint não é mais usado
// Substituído por /api/courses/send-to-review que cria e envia para revisão direto
// Mantido para compatibilidade com código antigo, mas pode ser removido no futuro

// ANTIGO: import { postApiV1Courses } from '@/http-gorio/courses/courses'
import { postApiV1CoursesDraft } from '@/http-gorio/courses/courses'
import type { ModelsCursoBody } from '@/http-gorio/models/modelsCursoBody'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: ModelsCursoBody = await request.json()

    // Validate required fields
    if (!body.title || !body.orgao_id) {
      return NextResponse.json(
        { error: 'Title and orgao_id are required' },
        { status: 400 }
      )
    }

    console.log('Creating course with data:', JSON.stringify(body, null, 2))

    // ANTIGO: const response = await postApiV1Courses(body) - criava com status 'opened'
    // NOVO - Criar curso como draft primeiro
    const response = await postApiV1CoursesDraft(body)

    console.log('API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      const createdCourse = response.data as any
      const courseId = createdCourse.id

      // NOVO - Automaticamente enviar curso para revisão (Casa Civil)
      if (courseId) {
        try {
          const cookieStore = await cookies()
          const accessToken = cookieStore.get('access_token')

          if (accessToken) {
            const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL
            await fetch(
              `${baseUrl}/api/v1/courses/${courseId}/send-to-review`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken.value}`,
                },
              }
            )
            console.log(`Course ${courseId} automatically sent to review`)
          }
        } catch (reviewError) {
          console.error('Error sending course to review:', reviewError)
          // Não falhar a criação se o envio para revisão falhar
          // O curso ainda foi criado com sucesso
        }
      }

      // Revalidate courses cache
      revalidateTag('courses')
      revalidateTag('courses-in-review') // NOVO - revalidar tab de revisão

      return NextResponse.json({
        course: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
