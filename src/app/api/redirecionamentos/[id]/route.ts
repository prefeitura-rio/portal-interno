import {
  deleteApiV1RulesId,
  getApiV1RulesId,
  putApiV1RulesId,
} from '@/http-redirecionamentos/regras/regras'
import { maskRedirectsPayload } from '@/lib/redirects-mask'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await getApiV1RulesId(Number(id))

    if (response.status === 200) {
      return NextResponse.json(maskRedirectsPayload(response.data))
    }

    return NextResponse.json(
      { error: 'Regra não encontrada', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao buscar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const response = await putApiV1RulesId(Number(id), body)

    if (response.status === 200) {
      return NextResponse.json(maskRedirectsPayload(response.data))
    }

    return NextResponse.json(
      {
        error: 'Erro ao atualizar regra de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao atualizar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await deleteApiV1RulesId(Number(id))

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      {
        error: 'Erro ao excluir regra de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao excluir regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
