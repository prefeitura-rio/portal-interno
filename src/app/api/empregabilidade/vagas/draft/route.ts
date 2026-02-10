import { postApiV1EmpregabilidadeVagasDraft } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { toApiInformacaoComplementar } from '@/lib/converters/empregabilidade'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.json()

    // Convert informacoes_complementares from frontend format to API format
    const body: EmpregabilidadeVagaBody = {
      ...rawBody,
      informacoes_complementares: rawBody.informacoes_complementares
        ? toApiInformacaoComplementar(rawBody.informacoes_complementares)
        : undefined,
    }

    // For drafts, validate 5 required fields
    const isMissing = (value: any) =>
      !value || (typeof value === 'string' && value.trim() === '')

    const missingFields = []
    if (isMissing(body.titulo)) missingFields.push('Título')
    if (isMissing(body.descricao)) missingFields.push('Descrição')
    if (isMissing(body.id_contratante)) missingFields.push('Empresa')
    if (isMissing(body.id_regime_contratacao))
      missingFields.push('Regime de Contratação')
    if (isMissing(body.id_modelo_trabalho))
      missingFields.push('Modelo de Trabalho')

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
          missingFields,
        },
        { status: 400 }
      )
    }

    console.log('Creating draft vaga with data:', JSON.stringify(body, null, 2))

    // The POST /api/v1/empregabilidade/vagas/draft endpoint creates a DRAFT vaga by default
    // No need to set status - the API endpoint determines this
    console.log(
      '✅ [API /vagas/draft] Using POST /vagas/draft endpoint which creates DRAFT vagas (em_edicao)'
    )

    // Call the external API using the existing client function
    const response = await postApiV1EmpregabilidadeVagasDraft(body)

    console.log('Draft API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      // Revalidate vagas cache (especially drafts)
      revalidateTag('empregabilidade-vagas')
      revalidateTag('empregabilidade-vagas-drafts')

      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to create draft vaga',
        message: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating draft vaga:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
