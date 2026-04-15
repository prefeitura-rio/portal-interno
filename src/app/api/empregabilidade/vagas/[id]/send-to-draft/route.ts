import {
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasIdSendToDraft,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Retornar vaga para rascunho (muda status para em_edicao)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Sending vaga back to draft (edição):', id)

    // Opcionalmente podemos validar existência da vaga antes
    const currentVagaResponse = await getApiV1EmpregabilidadeVagasId(id)
    if (currentVagaResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    const response = await putApiV1EmpregabilidadeVagasIdSendToDraft(id)

    console.log('Send-to-draft response:', { status: response.status })

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga enviada para edição (rascunho) com sucesso',
      })
    }

    if (response.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser enviada para edição. Verifique as regras de negócio.',
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
        { error: 'Vaga não pode ser enviada para edição neste estado.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao enviar vaga para edição' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error sending vaga to draft:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
