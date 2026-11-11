import { getApiV1RulesIdEvents } from '@/http-redirecionamentos/regras/regras'
import { maskRedirectsPayload } from '@/lib/redirects-mask'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')

    const response = await getApiV1RulesIdEvents(Number(id), {
      page: pageParam ? Number(pageParam) : undefined,
      pageSize: pageSizeParam ? Number(pageSizeParam) : undefined,
    })

    if (response.status === 200) {
      return NextResponse.json(maskRedirectsPayload(response.data))
    }

    return NextResponse.json(
      {
        error: 'Erro ao buscar histórico da regra',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao buscar histórico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
