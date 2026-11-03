import {
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasIdSendToApproval,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import {
  DATA_LIMITE_FIELD_LABEL,
  validateVagaDataLimite,
} from '@/lib/empregabilidade-vaga-dates'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Enviar vaga para aprovação (muda status para em_aprovacao)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Sending vaga to approval:', id)

    // Opcionalmente podemos validar existência da vaga antes
    const currentVagaResponse = await getApiV1EmpregabilidadeVagasId(id)
    if (currentVagaResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    // A vaga enviada para aprovação segue para publicação: a data limite
    // salva precisa ser futura, com o mesmo critério do formulário (DEV-168)
    const dataLimiteError = validateVagaDataLimite(
      currentVagaResponse.data.data_limite
    )
    if (dataLimiteError) {
      return NextResponse.json(
        { error: dataLimiteError, invalidFields: [DATA_LIMITE_FIELD_LABEL] },
        { status: 400 }
      )
    }

    const response = await putApiV1EmpregabilidadeVagasIdSendToApproval(id)

    console.log('Send-to-approval response:', { status: response.status })

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas', 'max')

      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga enviada para aprovação com sucesso',
      })
    }

    if (response.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser enviada para aprovação. Verifique os dados obrigatórios.',
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
        { error: 'Vaga não pode ser enviada para aprovação neste estado.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao enviar vaga para aprovação' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error sending vaga to approval:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
