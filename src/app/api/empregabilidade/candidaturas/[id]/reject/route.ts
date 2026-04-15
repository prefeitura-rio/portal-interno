import { putApiV1EmpregabilidadeCandidaturasIdReject } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Rejecting candidatura:', id)

    const response = await putApiV1EmpregabilidadeCandidaturasIdReject(id)

    console.log('Reject response status:', response.status)

    if (response.status === 200) {
      revalidateTag('empregabilidade-candidaturas')
      return NextResponse.json({
        candidatura: response.data,
        success: true,
        message: 'Candidatura reprovada',
      })
    }

    return NextResponse.json(
      { error: 'Failed to reject candidatura' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error rejecting candidatura:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
