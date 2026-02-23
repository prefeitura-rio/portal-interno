import {
  putApiV1EmpregabilidadeCandidaturasIdEtapa,
} from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const idEtapaAtual = body?.id_etapa_atual

    if (!('id_etapa_atual' in body)) {
      return NextResponse.json(
        { error: 'id_etapa_atual é obrigatório no corpo da requisição' },
        { status: 400 }
      )
    }

    const response = await putApiV1EmpregabilidadeCandidaturasIdEtapa(id, {
      id_etapa_atual: idEtapaAtual ?? undefined,
    })

    if (response.status === 200) {
      revalidateTag('empregabilidade-candidaturas')
      return NextResponse.json({
        candidatura: response.data,
        success: true,
        message: 'Etapa da candidatura atualizada com sucesso',
      })
    }

    return NextResponse.json(
      { error: 'Falha ao atualizar etapa da candidatura' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating candidatura etapa:', error)
    return NextResponse.json(
      {
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
