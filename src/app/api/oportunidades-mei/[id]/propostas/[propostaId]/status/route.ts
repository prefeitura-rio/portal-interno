import type {
  ModelsPropostaMEI,
  PutApiV1OportunidadesMeiIdPropostasPropostaIdStatusBody,
} from '@/http-gorio/models'
import { putApiV1OportunidadesMeiIdPropostasPropostaIdStatus } from '@/http-gorio/propostas-mei/propostas-mei'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; propostaId: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number.parseInt(resolvedParams.id)
    const propostaId = resolvedParams.propostaId

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid opportunity ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const frontendStatus = body.status

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
      `Updating proposal ${propostaId} status for opportunity ${id}:`,
      { frontend: frontendStatus, backend: backendStatus }
    )

    // The API has two separate status fields:
    // - status_cidadao: the actual proposal status (submitted/approved/rejected)
    // - status_admin: soft-delete flag (active/inactive)
    // The /status endpoint updates status_cidadao
    const requestBody: PutApiV1OportunidadesMeiIdPropostasPropostaIdStatusBody =
      {
        status: backendStatus,
      }

    console.log('Request body being sent to API:', requestBody)

    const response = await putApiV1OportunidadesMeiIdPropostasPropostaIdStatus(
      id,
      propostaId,
      requestBody
    )

    console.log('API response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 200) {
      const proposalData = response.data as ModelsPropostaMEI
      return NextResponse.json({
        proposal: proposalData,
        success: true,
        message: 'Proposal status updated successfully',
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
      { error: 'Failed to update proposal status' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating proposal status:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
