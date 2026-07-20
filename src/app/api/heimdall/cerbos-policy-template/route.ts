import { getCerbosPolicyTemplateApiV1CerbosPolicyTemplateGet } from '@/http-heimdall/health/health'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await getCerbosPolicyTemplateApiV1CerbosPolicyTemplateGet()

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      {
        error: 'Erro ao obter template de política Cerbos',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro no cerbos-policy-template:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
