import type {
  HeimdallPromotionResult,
  PromotionPlan,
} from '@/lib/heimdall-promotion'
import {
  type PromotionRequestBody,
  exportStagingSnapshot,
  parseRelease,
  parseRequestItems,
  postToCurrentHeimdall,
  upstreamError,
} from '@/lib/heimdall-promotion-server'
import { forbidUnlessRoles } from '@/lib/server-auth'
import { NextResponse } from 'next/server'

interface HeimdallApplyError {
  error?: unknown
  plan?: PromotionPlan
  errors?: string[]
}

/**
 * Aplica em produção a prévia aprovada. O Heimdall recalcula o plano e só
 * aplica se o hash for o mesmo da prévia; a escrita sai com o JWT de quem
 * aprovou e vai para o audit log, com o release.
 */
export async function POST(request: Request) {
  const forbidden = await forbidUnlessRoles(['superadmin'])
  if (forbidden) return forbidden

  try {
    const body = (await request.json()) as PromotionRequestBody
    const items = parseRequestItems(body.items)
    if (!items || typeof body.planHash !== 'string') {
      return NextResponse.json(
        { error: 'Prévia ausente: gere a prévia antes de aplicar' },
        { status: 400 }
      )
    }

    const snapshot = await exportStagingSnapshot()
    const response = await postToCurrentHeimdall<
      HeimdallPromotionResult | HeimdallApplyError
    >('/api/v1/config/promotion/apply', {
      snapshot,
      items,
      release: parseRelease(body.release),
      plan_hash: body.planHash,
    })

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    const error = response.data as HeimdallApplyError | null
    if (response.status === 409) {
      return NextResponse.json(
        {
          error:
            'A configuração mudou desde a prévia. Revise a prévia atualizada antes de aplicar.',
          plan: error?.plan,
        },
        { status: 409 }
      )
    }
    if (response.status === 422 && error?.errors) {
      return NextResponse.json(
        {
          error: 'A promoção não pode ser aplicada',
          details: { detail: error.errors.join('; ') },
        },
        { status: 422 }
      )
    }
    return upstreamError(
      'Erro ao aplicar a promoção',
      response.status,
      response.data
    )
  } catch (error) {
    console.error(
      '[API Heimdall] Erro ao aplicar a promoção:',
      error instanceof Error ? error.message : 'erro desconhecido'
    )
    return NextResponse.json(
      { error: 'Erro interno ao aplicar a promoção' },
      { status: 500 }
    )
  }
}
