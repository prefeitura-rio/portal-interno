import { getApiV1EmpregabilidadeComportamentosAtitudes } from '@/http-gorio/empregabilidade-comportamentos-atitudes/empregabilidade-comportamentos-atitudes'
import {
  parseCatalogoListParams,
  toCatalogoHabilidadesPage,
} from '@/lib/vaga-habilidades'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET - Catálogo de comportamentos e atitudes (habilidades da vaga, DEV-525).
 * Aceita `q` (busca sem acento), `page` e `pageSize` (até 100).
 */
export async function GET(request: NextRequest) {
  const parsed = parseCatalogoListParams(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const response = await getApiV1EmpregabilidadeComportamentosAtitudes(
      parsed.params
    )

    if (response.status === 200) {
      return NextResponse.json({
        ...toCatalogoHabilidadesPage(response.data, parsed.params),
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Erro ao buscar comportamentos e atitudes' },
      { status: response.status }
    )
  } catch (error) {
    console.error(
      '[GET /api/empregabilidade/comportamentos-atitudes] Error:',
      error
    )
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
