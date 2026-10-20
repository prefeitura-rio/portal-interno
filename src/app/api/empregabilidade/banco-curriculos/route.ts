import { getApiV1EmpregabilidadeBancoCurriculos } from '@/http-gorio/empregabilidade-banco-curriculos/empregabilidade-banco-curriculos'
import type { GetApiV1EmpregabilidadeBancoCurriculosParams } from '@/http-gorio/models'
import { parametrosDoFiltroCandidatos } from '@/lib/filtro-candidatos-params'
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
      ...(parametrosDoFiltroCandidatos(
        searchParams
      ) as Partial<GetApiV1EmpregabilidadeBancoCurriculosParams>),
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
