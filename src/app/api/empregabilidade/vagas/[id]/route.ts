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
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawBody = await request.json()

    // Convert informacoes_complementares from frontend format to API format
    const convertedInfos = rawBody.informacoes_complementares
      ? toApiInformacaoComplementar(rawBody.informacoes_complementares)
      : undefined

    const body: EmpregabilidadeVagaBody = {
      ...rawBody,
      informacoes_complementares: convertedInfos,
    }

    // Validar campos obrigatórios
    if (
      !body.titulo ||
      !body.descricao ||
      !body.id_contratante ||
      !body.id_regime_contratacao ||
      !body.id_modelo_trabalho
    ) {
      return NextResponse.json(
        {
          error:
            'Campos obrigatórios faltando: titulo, descricao, id_contratante, id_regime_contratacao, id_modelo_trabalho',
        },
        { status: 400 }
      )
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
