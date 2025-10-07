import {
  deleteApiV1OportunidadesMeiId,
  getApiV1OportunidadesMeiId,
} from '@/http-gorio/oportunidades-mei/oportunidades-mei'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const opportunityId = Number(id)

    const response = await getApiV1OportunidadesMeiId(opportunityId)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error in oportunidades-mei/[id] GET route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const opportunityId = Number(id)

    const response = await deleteApiV1OportunidadesMeiId(opportunityId)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error in oportunidades-mei/[id] DELETE route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
