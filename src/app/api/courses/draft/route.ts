import { postApiV1CoursesDraft } from '@/http/courses/courses'
import type { ModelsCursoBody } from '@/http/models/modelsCursoBody'
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

    console.log(
      'Creating draft course with data:',
      JSON.stringify(body, null, 2)
    )

    // Call the external API using the existing client function
    const response = await postApiV1CoursesDraft(body)

    console.log('Draft API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      return NextResponse.json({
        course: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to create draft course' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating draft course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
