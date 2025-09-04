import { postApiV1Courses } from '@/http/courses/courses'
import type { ModelsCursoBody } from '@/http/models/modelsCursoBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: ModelsCursoBody = await request.json()

    // Validate required fields
    if (!body.title || !body.orgao) {
      return NextResponse.json(
        { error: 'Title and orgao are required' },
        { status: 400 }
      )
    }

    console.log('Creating course with data:', JSON.stringify(body, null, 2))

    // Call the external API using the existing client function
    const response = await postApiV1Courses(body)

    console.log('API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      // Revalidate courses cache
      revalidateTag('courses')

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
