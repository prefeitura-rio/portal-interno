import { denyVagaChangeForCuration } from '@/lib/empregabilidade-curation-guard'
import {
  type ErroValidacaoApi,
  getErroValidacaoApi,
} from '@/lib/vaga-habilidades-erros-api'
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

    // Vaga publicada, pausada ou encerrada é só leitura para o editor com
    // curadoria, como na UI (DEV-126)
    const denial = await denyVagaChangeForCuration(id, 'Idiomas update')
    if (denial) return denial

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

    // DEV-744: no 4xx, repassa o erro da Go API (só `error` e `fields`,
    // saneados) em vez de só o texto fixo, como as outras rotas da vaga
    // (DEV-685); o 5xx fica com o texto fixo, sem detalhe interno
    const goError: ErroValidacaoApi =
      response.status >= 400 && response.status < 500
        ? getErroValidacaoApi(response.data)
        : {}
    if (response.status >= 500) {
      console.error(
        `[PUT /api/empregabilidade/vagas/[id]/idiomas-requisito] Go API status ${response.status}`
      )
    }
    return NextResponse.json(
      {
        ...goError,
        error: goError.error || 'Erro ao atualizar requisitos de idioma',
      },
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
