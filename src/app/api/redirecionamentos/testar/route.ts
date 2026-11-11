import { getApiV1Resolve } from '@/http-redirecionamentos/regras/regras'
import { maskRedirectsPayload } from '@/lib/redirects-mask'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url') || ''

    const response = await getApiV1Resolve({ url })

    if (response.status === 200) {
      return NextResponse.json(maskRedirectsPayload(response.data))
    }

    return NextResponse.json(
      {
        error: 'Erro ao testar URL',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao testar URL:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
