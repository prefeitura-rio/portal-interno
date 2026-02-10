import {
  deleteApiV1EmpregabilidadeVagasId,
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasId,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { toApiInformacaoComplementar } from '@/lib/converters/empregabilidade'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * GET - Buscar vaga por ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await getApiV1EmpregabilidadeVagasId(id)

    if (response.status === 200) {
      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT - Atualizar vaga
 * Validação depende do status atual da vaga:
 * - em_edicao (rascunho): valida 5 campos obrigatórios
 * - publicado_ativo/publicado_expirado: valida 11 campos obrigatórios
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawBody = await request.json()

    // Check if this is a draft save (sent by frontend when saving as draft)
    const { _saveAsDraft, ...bodyWithoutFlag } = rawBody
    const saveAsDraft = _saveAsDraft === true

    // Convert informacoes_complementares from frontend format to API format
    const convertedInfos = bodyWithoutFlag.informacoes_complementares
      ? toApiInformacaoComplementar(bodyWithoutFlag.informacoes_complementares)
      : undefined

    const body: EmpregabilidadeVagaBody = {
      ...bodyWithoutFlag,
      informacoes_complementares: convertedInfos,
    }

    // Helper function to check missing values
    const isMissing = (value: any) =>
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')

    // Get current vaga to check its status
    const currentVagaResponse = await getApiV1EmpregabilidadeVagasId(id)
    if (currentVagaResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    const currentVaga = currentVagaResponse.data
    const isDraft = currentVaga.status === 'em_edicao'

    // Validate based on status and save mode
    // If saving as draft (em_edicao and _saveAsDraft), validate only 5 fields
    // Otherwise (published or saving draft as published), validate 11 fields
    const shouldValidateAsDraft = isDraft && saveAsDraft

    // Always validate 5 base fields
    const baseMissingFields = []
    if (isMissing(body.titulo)) baseMissingFields.push('Título')
    if (isMissing(body.descricao)) baseMissingFields.push('Descrição')
    if (isMissing(body.id_contratante)) baseMissingFields.push('Empresa')
    if (isMissing(body.id_regime_contratacao))
      baseMissingFields.push('Regime de Contratação')
    if (isMissing(body.id_modelo_trabalho))
      baseMissingFields.push('Modelo de Trabalho')

    if (baseMissingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Campos obrigatórios faltando: ${baseMissingFields.join(', ')}`,
          missingFields: baseMissingFields,
        },
        { status: 400 }
      )
    }

    // If not saving as draft, validate additional 6 fields for publication
    if (!shouldValidateAsDraft) {
      const publishMissingFields = []
      if (isMissing(body.valor_vaga)) publishMissingFields.push('Valor da Vaga')
      if (isMissing(body.bairro)) publishMissingFields.push('Bairro')
      if (isMissing(body.data_limite)) publishMissingFields.push('Data Limite')
      if (isMissing(body.id_orgao_parceiro))
        publishMissingFields.push('Órgão Parceiro')
      if (isMissing(body.requisitos)) publishMissingFields.push('Requisitos')
      if (isMissing(body.responsabilidades))
        publishMissingFields.push('Responsabilidades')

      if (publishMissingFields.length > 0) {
        return NextResponse.json(
          {
            error: `Campos obrigatórios para publicação faltando: ${publishMissingFields.join(', ')}`,
            missingFields: publishMissingFields,
          },
          { status: 400 }
        )
      }
    }

    const response = await putApiV1EmpregabilidadeVagasId(id, body)

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Excluir vaga (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Deleting vaga:', id)

    const response = await deleteApiV1EmpregabilidadeVagasId(id)

    console.log('Delete response:', { status: response.status })

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        success: true,
        message: 'Vaga excluída com sucesso',
      })
    }

    return NextResponse.json(
      { error: 'Erro ao excluir vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
