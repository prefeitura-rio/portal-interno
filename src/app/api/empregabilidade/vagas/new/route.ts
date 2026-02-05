import {
  postApiV1EmpregabilidadeVagas,
  putApiV1EmpregabilidadeVagasIdPublish,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeVagaBody = await request.json()

    console.log(
      '🔵 [API /vagas/new] Received body:',
      JSON.stringify(body, null, 2)
    )
    console.log('🔵 [API /vagas/new] Required fields:', {
      titulo: body.titulo,
      descricao: body.descricao,
      id_contratante: body.id_contratante,
      id_regime_contratacao: body.id_regime_contratacao,
      id_modelo_trabalho: body.id_modelo_trabalho,
    })

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
      console.error(
        '🔴 [API /vagas/new] Validation failed - missing required fields'
      )

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

      console.error('🔴 [API /vagas/new] Missing fields:', missingFields)

      return NextResponse.json(
        {
          error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          missingFields,
        },
        { status: 400 }
      )
    }

    console.log(
      '✅ [API /vagas/new] Validation passed, creating and publishing vaga with data:',
      JSON.stringify(body, null, 2)
    )

    // IMPORTANT: The backend API creates vagas as DRAFT by default with POST /vagas
    // To publish immediately, we need to:
    // 1. Create the vaga (will be created as draft/em_edicao)
    // 2. Immediately publish it using PUT /vagas/{id}/publish
    console.log(
      '🔵 [API /vagas/new] Step 1: Creating vaga (will be draft initially)...'
    )

    const createResponse = await postApiV1EmpregabilidadeVagas(body)

    console.log('🔵 [API /vagas/new] Create response:', {
      status: createResponse.status,
      data: createResponse.data,
    })

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

    console.log('🔵 [API /vagas/new] Step 2: Publishing vaga with ID:', vagaId)

    const publishResponse = await putApiV1EmpregabilidadeVagasIdPublish(vagaId)

    console.log('🔵 [API /vagas/new] Publish response:', {
      status: publishResponse.status,
      data: publishResponse.data,
    })

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
