import {
  deleteApiV1OportunidadesMeiId,
  getApiV1OportunidadesMeiId,
  putApiV1OportunidadesMeiId,
} from '@/http-gorio/oportunidades-mei/oportunidades-mei'
import { NextResponse } from 'next/server'

export async function GET(
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

    const response = await getApiV1OportunidadesMeiId(id)

    if (response.status === 200) {
      return NextResponse.json({
        opportunity: response.data,
        success: true,
      })
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching MEI opportunity:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()

    console.log(`Updating MEI opportunity ${id}:`, body)

    const response = await putApiV1OportunidadesMeiId(id, body)

    if (response.status === 200) {
      return NextResponse.json({
        opportunity: response.data,
        success: true,
        message: 'Opportunity updated successfully',
      })
    }

    // Handle error responses
    if (response.status === 400) {
      return NextResponse.json(
        { error: 'Validation error', details: response.data },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating MEI opportunity:', error)
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
    const resolvedParams = await params
    const id = Number.parseInt(resolvedParams.id)

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid opportunity ID' },
        { status: 400 }
      )
    }

    console.log(`Deleting MEI opportunity ${id}`)

    const response = await deleteApiV1OportunidadesMeiId(id)

    if (response.status === 200) {
      return NextResponse.json({
        success: true,
        message: 'Opportunity deleted successfully',
      })
    }

    // Handle error responses
    if (response.status === 400) {
      return NextResponse.json(
        { error: 'Validation error', details: response.data },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting MEI opportunity:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
