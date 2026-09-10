import { getApiV1EmpregabilidadeBancoCurriculosCpf } from '@/http-gorio/empregabilidade-banco-curriculos/empregabilidade-banco-curriculos'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params
    const response = await getApiV1EmpregabilidadeBancoCurriculosCpf(cpf)

    return NextResponse.json(response.data, { status: response.status })
  } catch (error) {
    console.error('Error fetching currículo:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar currículo' },
      { status: 500 }
    )
  }
}
