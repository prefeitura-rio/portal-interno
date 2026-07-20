import { readinessCheckApiV1ReadyzGet } from '@/http-heimdall/health/health'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await readinessCheckApiV1ReadyzGet()

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      {
        error: 'Erro ao verificar prontidão do serviço',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro no readyz:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
