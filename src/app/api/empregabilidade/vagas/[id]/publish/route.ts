import {
  getApiV1EmpregabilidadeVagasId,
  putApiV1EmpregabilidadeVagasIdPublish,
} from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Publicar vaga (mudar status de em_edicao para publicado)
 * Valida que todos os 11 campos obrigatórios estão preenchidos antes de publicar
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Publishing vaga:', id)

    // Helper function to check missing values
    const isMissing = (value: any) =>
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')

    // Get current vaga to validate required fields
    const currentVagaResponse = await getApiV1EmpregabilidadeVagasId(id)
    if (currentVagaResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    const vaga = currentVagaResponse.data

    // Validate all 11 required fields for publication
    const missingFields = []

    // Base 5 fields
    if (isMissing(vaga.titulo)) missingFields.push('Título')
    if (isMissing(vaga.descricao)) missingFields.push('Descrição')
    if (isMissing(vaga.id_contratante)) missingFields.push('Empresa')
    if (isMissing(vaga.id_regime_contratacao))
      missingFields.push('Regime de Contratação')
    if (isMissing(vaga.id_modelo_trabalho))
      missingFields.push('Modelo de Trabalho')

    // Additional 6 fields for publication
    if (isMissing(vaga.valor_vaga)) missingFields.push('Valor da Vaga')
    if (isMissing(vaga.bairro)) missingFields.push('Bairro')
    if (isMissing(vaga.data_limite)) missingFields.push('Data Limite')
    if (isMissing(vaga.id_orgao_parceiro)) missingFields.push('Órgão Parceiro')
    if (isMissing(vaga.requisitos)) missingFields.push('Requisitos')
    if (isMissing(vaga.responsabilidades))
      missingFields.push('Responsabilidades')

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Campos obrigatórios para publicação faltando: ${missingFields.join(', ')}`,
          missingFields,
        },
        { status: 400 }
      )
    }

    const response = await putApiV1EmpregabilidadeVagasIdPublish(id)

    console.log('Publish response:', { status: response.status })

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga publicada com sucesso',
      })
    }

    // Handle specific error codes
    if (response.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser publicada. Verifique os campos obrigatórios.',
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
        { error: 'Vaga já está publicada.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao publicar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error publishing vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
