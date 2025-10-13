import type { ModelsStatusPropostaCidadao } from '@/http-gorio/models'
import { putApiV1OportunidadesMeiIdPropostasStatus } from '@/http-gorio/propostas-mei/propostas-mei'
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

    const body = await request.json()
    const { proposalIds, status: frontendStatus } = body

    if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
      return NextResponse.json(
        { error: 'proposalIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (
      !frontendStatus ||
      !['approved', 'pending', 'rejected'].includes(frontendStatus)
    ) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Map frontend status to backend status_cidadao
    const mapStatusToBackend = (
      status: string
    ): ModelsStatusPropostaCidadao => {
      switch (status) {
        case 'approved':
          return 'approved'
        case 'rejected':
          return 'rejected'
        case 'pending':
          return 'submitted'
        default:
          return 'submitted'
      }
    }

    const backendStatus = mapStatusToBackend(frontendStatus)

    console.log(
      `Bulk updating ${proposalIds.length} proposals to status ${backendStatus} (frontend: ${frontendStatus}) for opportunity ${id}`
    )

    // Use the bulk update endpoint instead of multiple individual calls
    const response = await putApiV1OportunidadesMeiIdPropostasStatus(id, {
      proposta_ids: proposalIds.map(id => id.toString()),
      status: backendStatus,
    })

    console.log('Bulk update API response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 200) {
      const responseData = response.data as any
      const updatedCount = responseData.updated_count || proposalIds.length

      return NextResponse.json({
        success: true,
        message: `${updatedCount} proposals updated successfully`,
        successCount: updatedCount,
        data: responseData,
      })
    }

    // Handle error responses
    if (response.status === 400) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: response.data,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update proposals',
        status: response.status,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error in bulk status update:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
