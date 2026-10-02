import type { PromotionPlan } from '@/lib/heimdall-promotion'
import {
  type PromotionRequestBody,
  currentHeimdallBaseUrl,
  exportStagingSnapshot,
  parseRelease,
  parseRequestItems,
  postToCurrentHeimdall,
  stagingHeimdallBaseUrl,
  upstreamError,
} from '@/lib/heimdall-promotion-server'
import { forbidUnlessRoles } from '@/lib/server-auth'
import { NextResponse } from 'next/server'

/**
 * Prévia da promoção dos itens que um release precisa: exporta staging e pede
 * ao Heimdall desta sessão o que criaria ou atualizaria. Nada é escrito.
 */
export async function POST(request: Request) {
  const forbidden = await forbidUnlessRoles(['admin', 'superadmin'])
  if (forbidden) return forbidden

  try {
    const body = (await request.json()) as PromotionRequestBody
    const items = parseRequestItems(body.items)
    if (!items) {
      return NextResponse.json(
        { error: 'Nenhum item válido para promover' },
        { status: 400 }
      )
    }

    const snapshot = await exportStagingSnapshot()
    const response = await postToCurrentHeimdall<PromotionPlan>(
      '/api/v1/config/promotion/plan',
      { snapshot, items, release: parseRelease(body.release) }
    )
    if (response.status !== 200) {
      return upstreamError(
        'Erro ao gerar a prévia em produção',
        response.status,
        response.data
      )
    }

    return NextResponse.json({
      sourceBaseUrl: stagingHeimdallBaseUrl(),
      targetBaseUrl: currentHeimdallBaseUrl(),
      plan: response.data,
    })
  } catch (error) {
    console.error(
      '[API Heimdall] Erro ao gerar prévia da promoção:',
      error instanceof Error ? error.message : 'erro desconhecido'
    )
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao gerar a prévia da promoção',
      },
      { status: 500 }
    )
  }
}
