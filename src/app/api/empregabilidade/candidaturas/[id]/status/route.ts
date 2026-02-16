import { putApiV1EmpregabilidadeCandidaturasIdStatus } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import type { EmpregabilidadeStatusCandidatura } from '@/http-gorio/models'
import { mapFrontendStatusToBackend } from '@/lib/status-config/empregabilidade'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const backendStatus = mapFrontendStatusToBackend(body.status)

    console.log('Updating candidatura status:', {
      id,
      frontendStatus: body.status,
      backendStatus,
    })

    const response = await putApiV1EmpregabilidadeCandidaturasIdStatus(id, {
      status: backendStatus as EmpregabilidadeStatusCandidatura,
    })

    console.log('Status update response:', response.status)

    if (response.status === 200) {
      revalidateTag('empregabilidade-candidaturas')
      return NextResponse.json({
        candidatura: response.data,
        success: true,
        message: 'Status atualizado com sucesso',
      })
    }

    return NextResponse.json(
      { error: 'Failed to update candidatura status' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating candidatura status:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
