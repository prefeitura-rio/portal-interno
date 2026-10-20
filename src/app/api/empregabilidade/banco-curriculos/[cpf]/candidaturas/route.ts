import { getApiV1EmpregabilidadeBancoCurriculosCpfCandidaturas } from '@/http-gorio/empregabilidade-banco-curriculos/empregabilidade-banco-curriculos'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10
    const search = searchParams.get('search')?.trim() || undefined

    const response =
      await getApiV1EmpregabilidadeBancoCurriculosCpfCandidaturas(cpf, {
        page,
        pageSize,
        search,
      })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error) {
    console.error('Error fetching histórico de candidaturas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar candidaturas' },
      { status: 500 }
    )
  }
}
