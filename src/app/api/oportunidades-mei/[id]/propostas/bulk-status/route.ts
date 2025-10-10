import { putApiV1OportunidadesMeiIdPropostasPropostaIdStatus } from '@/http-gorio/propostas-mei/propostas-mei'
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
    const mapStatusToBackend = (status: string) => {
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

    // Update all proposals in parallel
    const updatePromises = proposalIds.map(proposalId =>
      putApiV1OportunidadesMeiIdPropostasPropostaIdStatus(
        id,
        proposalId.toString(),
        {
          status: backendStatus,
        }
      )
    )

    const results = await Promise.allSettled(updatePromises)

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')

    console.log(
      `Bulk update completed: ${successful.length} succeeded, ${failed.length} failed`
    )

    if (failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${successful.length} proposals updated, ${failed.length} failed`,
          successCount: successful.length,
          failCount: failed.length,
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: true,
      message: `${successful.length} proposals updated successfully`,
      successCount: successful.length,
    })
  } catch (error) {
    console.error('Error in bulk status update:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
