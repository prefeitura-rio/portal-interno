import { getApiV1EmpregabilidadeHabilidadesAreasAtuacaoIdHabilidades } from '@/http-gorio/empregabilidade-habilidades/empregabilidade-habilidades'
import {
  parseAreaAtuacaoId,
  parseCatalogoListParams,
  toCatalogoHabilidadesPage,
} from '@/lib/vaga-habilidades'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET - Conhecimentos de uma área de atuação (habilidades da vaga, DEV-525).
 * Aceita `q` (busca sem acento), `page` e `pageSize` (até 100).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const areaId = parseAreaAtuacaoId(id)
  if (areaId === null) {
    return NextResponse.json(
      { error: 'Área de atuação inválida' },
      { status: 400 }
    )
  }

  const parsed = parseCatalogoListParams(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const response =
      await getApiV1EmpregabilidadeHabilidadesAreasAtuacaoIdHabilidades(
        areaId,
        parsed.params
      )

    if (response.status === 200) {
      return NextResponse.json({
        ...toCatalogoHabilidadesPage(response.data, parsed.params),
        success: true,
      })
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Área de atuação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar conhecimentos da área de atuação' },
      { status: response.status }
    )
  } catch (error) {
    console.error(
      '[GET /api/empregabilidade/areas-atuacao/[id]/conhecimentos] Error:',
      error
    )
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
