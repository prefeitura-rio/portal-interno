import { getApiV1EmpregabilidadeBancoCurriculos } from '@/http-gorio/empregabilidade-banco-curriculos/empregabilidade-banco-curriculos'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10
    const search = searchParams.get('search')?.trim() || undefined

    const response = await getApiV1EmpregabilidadeBancoCurriculos({
      page,
      pageSize,
      search,
    })

    return NextResponse.json(response.data, { status: response.status })
  } catch (error) {
    console.error('Error fetching banco de currículos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar currículos' },
      { status: 500 }
    )
  }
}
