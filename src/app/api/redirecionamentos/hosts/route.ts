import { getApiV1Hosts } from '@/http-redirecionamentos/hosts/hosts'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await getApiV1Hosts()

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      {
        error: 'Erro ao listar hosts',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao listar hosts:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
