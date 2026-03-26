import { putApiV1EmpregabilidadeCandidaturasBulkEtapa } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { cleanCPF } from '@/lib/cpf-validator'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const { cpfs: rawCpfs, id_etapa: etapaId, id_vaga: vagaId } = body

    if (!Array.isArray(rawCpfs) || rawCpfs.length === 0) {
      return NextResponse.json(
        { error: 'É necessário informar ao menos um CPF' },
        { status: 400 }
      )
    }

    if (!etapaId) {
      return NextResponse.json(
        { error: 'ID da etapa é obrigatório' },
        { status: 400 }
      )
    }

    if (!vagaId) {
      return NextResponse.json(
        { error: 'ID da vaga é obrigatório' },
        { status: 400 }
      )
    }

    const cpfs = rawCpfs
      .map((cpf: string) => cleanCPF(String(cpf)))
      .filter(Boolean)

    if (cpfs.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum CPF válido informado' },
        { status: 400 }
      )
    }

    const response = await putApiV1EmpregabilidadeCandidaturasBulkEtapa({
      cpfs,
      id_etapa: etapaId,
      vaga_id: vagaId,
    })

    if (response.status === 200) {
      return NextResponse.json({
        success: true,
        message: 'Etapa das candidaturas atualizada com sucesso',
      })
    }

    if (response.status === 409) {
      return NextResponse.json(
        {
          error:
            'Todos os candidatos devem estar na mesma etapa para avançar em lote',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao atualizar etapa das candidaturas em lote' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating bulk candidaturas etapa:', error)
    return NextResponse.json(
      {
        error: 'Erro interno ao atualizar etapa em lote',
        message: error instanceof Error ? error.message : 'Erro inesperado',
      },
      { status: 500 }
    )
  }
}
