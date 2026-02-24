import { putApiV1EmpregabilidadeCandidaturasBulkStatus } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import type { EmpregabilidadeStatusCandidatura } from '@/http-gorio/models'
import type { CandidatoStatus } from '@/hooks/use-candidatos'
import { cleanCPF } from '@/lib/cpf-validator'
import { mapFrontendStatusToBackend } from '@/lib/status-config/empregabilidade'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const { cpfs: rawCpfs, status: frontendStatus, id_vaga: vagaId } = body

    if (!Array.isArray(rawCpfs) || rawCpfs.length === 0) {
      return NextResponse.json(
        { error: 'É necessário informar ao menos um CPF' },
        { status: 400 }
      )
    }

    if (!vagaId) {
      return NextResponse.json(
        { error: 'ID da vaga é obrigatório' },
        { status: 400 }
      )
    }

    const cpfs = rawCpfs.map((cpf: string) => cleanCPF(String(cpf))).filter(Boolean)

    if (cpfs.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum CPF válido informado' },
        { status: 400 }
      )
    }

    const backendStatus = mapFrontendStatusToBackend(
      frontendStatus as CandidatoStatus
    ) as EmpregabilidadeStatusCandidatura

    const response = await putApiV1EmpregabilidadeCandidaturasBulkStatus({
      cpfs,
      status: backendStatus,
      vaga_id: vagaId,
    })

    if (response.status === 200) {
      return NextResponse.json({
        success: true,
        message: 'Status das candidaturas atualizado com sucesso',
      })
    }

    return NextResponse.json(
      { error: 'Falha ao atualizar status em lote' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating bulk candidaturas status:', error)
    return NextResponse.json(
      {
        error: 'Erro interno ao atualizar status em lote',
        message: error instanceof Error ? error.message : 'Erro inesperado',
      },
      { status: 500 }
    )
  }
}
