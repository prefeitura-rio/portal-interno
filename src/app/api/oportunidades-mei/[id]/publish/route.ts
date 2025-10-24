import { putApiV1OportunidadesMeiIdPublish } from '@/http-gorio/oportunidades-mei/oportunidades-mei'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number.parseInt(resolvedParams.id)

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid opportunity ID' },
        { status: 400 }
      )
    }

    console.log(`Publishing MEI opportunity ${id}`)

    const response = await putApiV1OportunidadesMeiIdPublish(id)

    if (response.status === 200) {
      return NextResponse.json({
        opportunity: response.data,
        success: true,
        message: 'Opportunity published successfully',
      })
    }

    // Handle error responses
    if (response.status === 400) {
      return NextResponse.json(
        { error: 'Validation error', details: response.data },
        { status: 400 }
      )
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to publish opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error publishing MEI opportunity:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
