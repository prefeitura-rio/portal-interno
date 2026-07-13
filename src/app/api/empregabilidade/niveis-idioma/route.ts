import { getApiV1EmpregabilidadeNiveisIdioma } from '@/http-gorio/empregabilidade-niveis-idioma/empregabilidade-niveis-idioma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await getApiV1EmpregabilidadeNiveisIdioma({
      page: 1,
      pageSize: 100,
    })

    if (response.status === 200) {
      const data = response.data as any
      return NextResponse.json({
        data: data.data || [],
        meta: data.meta || { page: 1, page_size: 100, total: 0 },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Erro ao buscar níveis de idioma' },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/niveis-idioma] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
