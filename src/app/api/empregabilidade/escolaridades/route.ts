import { getApiV1EmpregabilidadeEscolaridades } from '@/http-gorio/empregabilidade-escolaridades/empregabilidade-escolaridades'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await getApiV1EmpregabilidadeEscolaridades({
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
      { error: 'Erro ao buscar escolaridades' },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/escolaridades] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
