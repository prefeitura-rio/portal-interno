import { patchApiV1RulesStatus } from '@/http-redirecionamentos/regras/regras'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    const response = await patchApiV1RulesStatus(body)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      {
        error: 'Erro ao atualizar status das regras',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
