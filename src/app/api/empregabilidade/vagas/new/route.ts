import {
  postApiV1EmpregabilidadeVagas,
  putApiV1EmpregabilidadeVagasIdPublish,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { toApiInformacaoComplementar } from '@/lib/converters/empregabilidade'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.json()

    // Convert informacoes_complementares from frontend format to API format
    const convertedInfos = rawBody.informacoes_complementares
      ? toApiInformacaoComplementar(rawBody.informacoes_complementares)
      : undefined

    const body: EmpregabilidadeVagaBody = {
      ...rawBody,
      informacoes_complementares: convertedInfos,
    }

    // Validate required fields (check for empty strings too)
    const isMissing = (value: any) =>
      !value || (typeof value === 'string' && value.trim() === '')

    if (
      isMissing(body.titulo) ||
      isMissing(body.descricao) ||
      isMissing(body.id_contratante) ||
      isMissing(body.id_regime_contratacao) ||
      isMissing(body.id_modelo_trabalho)
    ) {
      // Show which fields are missing for better debugging
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

    // IMPORTANT: The backend API creates vagas as DRAFT by default with POST /vagas
    // To publish immediately, we need to:
    // 1. Create the vaga (will be created as draft/em_edicao)
    // 2. Immediately publish it using PUT /vagas/{id}/publish
    const createResponse = await postApiV1EmpregabilidadeVagas(body)

    if (createResponse.status !== 201) {
      return NextResponse.json(
        { error: 'Failed to create vaga' },
        { status: createResponse.status }
      )
    }

    // Step 2: Publish the vaga immediately
    const vagaId = createResponse.data.id
    if (!vagaId) {
      return NextResponse.json(
        { error: 'Vaga created but no ID returned' },
        { status: 500 }
      )
    }

    const publishResponse = await putApiV1EmpregabilidadeVagasIdPublish(vagaId)

    if (publishResponse.status === 200) {
      // Revalidate vagas cache
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: publishResponse.data,
        success: true,
        message: 'Vaga criada e publicada com sucesso',
      })
    }

    // If publish failed, still return the created vaga (will be in draft state)
    return NextResponse.json(
      {
        vaga: createResponse.data,
        success: false,
        warning: 'Vaga criada mas não foi possível publicar automaticamente',
      },
      { status: publishResponse.status }
    )
  } catch (error) {
    console.error('Error creating vaga:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
