import { putApiV1EmpregabilidadeCandidaturasIdApprove } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Approving candidatura:', id)

    const response = await putApiV1EmpregabilidadeCandidaturasIdApprove(id)

    console.log('Approve response status:', response.status)

    if (response.status === 200) {
      revalidateTag('empregabilidade-candidaturas')
      return NextResponse.json({
        candidatura: response.data,
        success: true,
        message: 'Candidatura aprovada com sucesso',
      })
    }

    return NextResponse.json(
      { error: 'Failed to approve candidatura' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error approving candidatura:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
