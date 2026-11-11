import {
  getApiV1Rules,
  postApiV1Rules,
} from '@/http-redirecionamentos/regras/regras'
import { maskRedirectsPayload } from '@/lib/redirects-mask'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const hostParam = searchParams.get('host')
    const qParam = searchParams.get('q')
    const enabledParam = searchParams.get('enabled')
    const statusCodeParam = searchParams.get('status_code')

    const response = await getApiV1Rules({
      page: pageParam ? Number(pageParam) : undefined,
      pageSize: pageSizeParam ? Number(pageSizeParam) : undefined,
      host: hostParam || undefined,
      q: qParam || undefined,
      enabled:
        enabledParam === 'true'
          ? true
          : enabledParam === 'false'
            ? false
            : undefined,
      status_code: statusCodeParam ? Number(statusCodeParam) : undefined,
    })

    if (response.status === 200) {
      return NextResponse.json(maskRedirectsPayload(response.data))
    }

    return NextResponse.json(
      {
        error: 'Erro ao listar regras de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao listar regras:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await postApiV1Rules(body)

    if (response.status === 201) {
      return NextResponse.json(maskRedirectsPayload(response.data), {
        status: 201,
      })
    }

    return NextResponse.json(
      {
        error: 'Erro ao criar regra de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao criar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
