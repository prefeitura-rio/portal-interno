import {
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasIdUnfreeze,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Descongelar vaga (reativar vaga pausada)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const currentVagaResponse = await getApiV1EmpregabilidadeVagasId(id)
    if (currentVagaResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    const response = await putApiV1EmpregabilidadeVagasIdUnfreeze(id)

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')
      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga descongelada com sucesso',
      })
    }

    if (response.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser descongelada. Verifique as regras de negócio.',
        },
        { status: 400 }
      )
    }
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Vaga não encontrada.' },
        { status: 404 }
      )
    }
    if (response.status === 409) {
      return NextResponse.json(
        { error: 'Vaga não pode ser descongelada neste estado.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao descongelar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error unfreezing vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
