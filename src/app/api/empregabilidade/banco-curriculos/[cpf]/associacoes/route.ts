import { postApiV1EmpregabilidadeBancoCurriculosCpfAssociacoes } from '@/http-gorio/empregabilidade-banco-curriculos/empregabilidade-banco-curriculos'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params
    const body = await request.json().catch(() => null)
    const idsVagas: unknown = body?.ids_vagas

    if (
      !Array.isArray(idsVagas) ||
      idsVagas.length === 0 ||
      !idsVagas.every(id => typeof id === 'string')
    ) {
      return NextResponse.json(
        { error: 'Selecione ao menos uma vaga' },
        { status: 400 }
      )
    }

    const response =
      await postApiV1EmpregabilidadeBancoCurriculosCpfAssociacoes(cpf, {
        ids_vagas: idsVagas,
      })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error) {
    console.error('Error associating candidato:', error)
    return NextResponse.json(
      { error: 'Erro ao associar candidato' },
      { status: 500 }
    )
  }
}
