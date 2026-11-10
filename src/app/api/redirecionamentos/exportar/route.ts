import { getApiV1RulesExport } from '@/http-redirecionamentos/regras/regras'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await getApiV1RulesExport()

    if (response.status === 200) {
      const headers = new Headers()
      const contentType =
        response.headers.get('content-type') || 'text/csv; charset=utf-8'
      headers.set('Content-Type', contentType)

      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        headers.set('Content-Disposition', contentDisposition)
      }

      return new NextResponse(response.data, {
        status: 200,
        headers,
      })
    }

    return NextResponse.json(
      {
        error: 'Erro ao exportar regras de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao exportar CSV:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
