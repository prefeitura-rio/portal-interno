import { NextResponse } from 'next/server'
import { customFetchGoRio } from '../../../../../../../custom-fetch-gorio'

interface IdiomaRequisitoInput {
  id_vaga: string
  id_idioma: string
  id_nivel_minimo: string
}

interface IdiomasRequisitoBody {
  requisitos: IdiomaRequisitoInput[]
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: IdiomasRequisitoBody = await request.json()

    const response = await customFetchGoRio<{ status: number; data: unknown }>(
      `/api/v1/empregabilidade/vagas/${id}/idiomas-requisito`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    if (response.status === 200) {
      return NextResponse.json({ success: true, data: response.data })
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar requisitos de idioma' },
      { status: response.status }
    )
  } catch (error) {
    console.error(
      `[PUT /api/empregabilidade/vagas/[id]/idiomas-requisito] Error:`,
      error
    )
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
