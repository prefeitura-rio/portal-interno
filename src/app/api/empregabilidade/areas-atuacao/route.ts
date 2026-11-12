import { getApiV1EmpregabilidadeHabilidadesAreasAtuacao } from '@/http-gorio/empregabilidade-habilidades/empregabilidade-habilidades'
import {
  parseCatalogoListParams,
  toCatalogoHabilidadesPage,
} from '@/lib/vaga-habilidades'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET - Catálogo de áreas de atuação (habilidades da vaga, DEV-525).
 * Aceita `q` (busca sem acento), `page` e `pageSize` (até 100).
 */
export async function GET(request: NextRequest) {
  const parsed = parseCatalogoListParams(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const response = await getApiV1EmpregabilidadeHabilidadesAreasAtuacao(
      parsed.params
    )

    if (response.status === 200) {
      return NextResponse.json({
        ...toCatalogoHabilidadesPage(response.data, parsed.params),
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Erro ao buscar áreas de atuação' },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/areas-atuacao] Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
