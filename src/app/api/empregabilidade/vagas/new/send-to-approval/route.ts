import {
  postApiV1EmpregabilidadeVagas,
  putApiV1EmpregabilidadeVagasIdSendToApproval,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { toApiInformacaoComplementar } from '@/lib/converters/empregabilidade'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * POST - Cria uma nova vaga (como rascunho) e envia para aprovação (status em_aprovacao)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.json()

    const convertedInfos = rawBody.informacoes_complementares
      ? toApiInformacaoComplementar(rawBody.informacoes_complementares)
      : undefined

    const body: EmpregabilidadeVagaBody = {
      ...rawBody,
      informacoes_complementares: convertedInfos,
    }

    const isMissing = (value: any) =>
      !value || (typeof value === 'string' && value.trim() === '')

    if (
      isMissing(body.titulo) ||
      isMissing(body.descricao) ||
      isMissing(body.id_contratante) ||
      isMissing(body.id_regime_contratacao) ||
      isMissing(body.id_modelo_trabalho)
    ) {
      const missingFields = []
      if (isMissing(body.titulo)) missingFields.push('titulo')
      if (isMissing(body.descricao)) missingFields.push('descricao')
      if (isMissing(body.id_contratante))
        missingFields.push('id_contratante (empresa)')
      if (isMissing(body.id_regime_contratacao))
        missingFields.push('id_regime_contratacao')
      if (isMissing(body.id_modelo_trabalho))
        missingFields.push('id_modelo_trabalho')

      return NextResponse.json(
        {
          error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          missingFields,
        },
        { status: 400 }
      )
    }

    // Step 1: criar a vaga (será criada como rascunho/em_edicao)
    const createResponse = await postApiV1EmpregabilidadeVagas(body)

    if (createResponse.status !== 201) {
      return NextResponse.json(
        { error: 'Failed to create vaga' },
        { status: createResponse.status }
      )
    }

    const vagaId = createResponse.data.id
    if (!vagaId) {
      return NextResponse.json(
        { error: 'Vaga created but no ID returned' },
        { status: 500 }
      )
    }

    // Step 2: enviar para aprovação
    const sendToApprovalResponse =
      await putApiV1EmpregabilidadeVagasIdSendToApproval(vagaId)

    if (sendToApprovalResponse.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: sendToApprovalResponse.data,
        success: true,
        message: 'Vaga criada e enviada para aprovação com sucesso',
      })
    }

    if (sendToApprovalResponse.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser enviada para aprovação. Verifique os dados obrigatórios.',
        },
        { status: 400 }
      )
    }

    if (sendToApprovalResponse.status === 404) {
      return NextResponse.json(
        { error: 'Vaga não encontrada.' },
        { status: 404 }
      )
    }

    if (sendToApprovalResponse.status === 409) {
      return NextResponse.json(
        { error: 'Vaga não pode ser enviada para aprovação neste estado.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao enviar vaga para aprovação' },
      { status: sendToApprovalResponse.status }
    )
  } catch (error) {
    console.error(
      'Error creating vaga and sending to approval in /new/send-to-approval:',
      error
    )
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
