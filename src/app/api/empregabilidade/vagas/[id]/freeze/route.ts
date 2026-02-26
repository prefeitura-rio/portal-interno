import {
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasIdFreeze,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Congelar vaga (pausar vaga publicada)
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

    const response = await putApiV1EmpregabilidadeVagasIdFreeze(id)

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')
      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga pausada com sucesso',
      })
    }

    if (response.status === 400) {
      return NextResponse.json(
        { error: 'Vaga não pode ser pausada. Verifique as regras de negócio.' },
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
        { error: 'Vaga não pode ser pausada neste estado.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao pausar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error freezing vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
