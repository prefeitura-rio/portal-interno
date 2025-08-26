import type { ModelsCursoBody } from '@/http/models/modelsCursoBody'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body: ModelsCursoBody = await request.json()

    // Validate required fields
    if (!body.title || !body.organization) {
      return NextResponse.json(
        { error: 'Title and organization are required' },
        { status: 400 }
      )
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/v1/courses/draft`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`
      )
    }

    const data = await response.json()

    return NextResponse.json({
      course: data.data,
      success: true,
    })
  } catch (error) {
    console.error('Error creating draft course:', error)
    return NextResponse.json(
      {
        error: 'Failed to create draft course',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
