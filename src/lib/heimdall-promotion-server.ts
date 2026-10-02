import { HEIMDALL_STAGING_BASE_URL } from '@/lib/heimdall-compare'
import {
  type PromotionItem,
  parsePromotionItem,
  promotionItemId,
} from '@/lib/heimdall-promotion'
import { NextResponse } from 'next/server'
import { customFetchHeimdall } from '../../custom-fetch-heimdall'

const MAX_ITEMS = 200

export interface PromotionRequestBody {
  items?: unknown
  release?: unknown
  planHash?: unknown
}

export function currentHeimdallBaseUrl(): string {
  const baseUrl = process.env.HEIMDALL_BASE_API_URL
  if (!baseUrl) {
    throw new Error('HEIMDALL_BASE_API_URL não configurada')
  }
  return baseUrl.replace(/\/+$/, '')
}

export function stagingHeimdallBaseUrl(): string {
  return (
    process.env.HEIMDALL_STAGING_BASE_API_URL ?? HEIMDALL_STAGING_BASE_URL
  ).replace(/\/+$/, '')
}

/**
 * Exporta a config do Heimdall de staging com o token só de leitura do portal
 * (HEIMDALL_STAGING_READONLY_TOKEN). Ninguém precisa colar JWT de staging.
 */
export async function exportStagingSnapshot(): Promise<unknown> {
  const token = process.env.HEIMDALL_STAGING_READONLY_TOKEN
  if (!token) {
    throw new Error('HEIMDALL_STAGING_READONLY_TOKEN não configurado no portal')
  }
  const response = await fetch(
    `${stagingHeimdallBaseUrl()}/api/v1/config/export`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!response.ok) {
    throw new Error(
      `Falha ao exportar a configuração de staging (${response.status})`
    )
  }
  return response.json()
}

/** Itens válidos e sem repetição, ou null se não houver nenhum. */
export function parseRequestItems(value: unknown): PromotionItem[] | null {
  if (!Array.isArray(value)) return null
  const items = new Map<string, PromotionItem>()
  for (const raw of value.slice(0, MAX_ITEMS)) {
    const item =
      typeof raw === 'string'
        ? parsePromotionItem(raw)
        : typeof raw?.entity === 'string' && typeof raw?.key === 'string'
          ? parsePromotionItem(`${raw.entity}:${raw.key}`)
          : null
    if (item) items.set(promotionItemId(item), item)
  }
  return items.size > 0 ? [...items.values()] : null
}

export function parseRelease(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 200 ? value : null
}

/** POST no Heimdall desta sessão, com o JWT do usuário logado. */
export function postToCurrentHeimdall<T>(
  path: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  return customFetchHeimdall<{ status: number; data: T }>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Erro do Heimdall ({error, status_code}) repassado no formato do BFF. */
export function upstreamError(message: string, status: number, data: unknown) {
  const upstream = (data as { error?: unknown } | null)?.error
  return NextResponse.json(
    {
      error: message,
      details: {
        detail: typeof upstream === 'string' ? upstream : undefined,
      },
    },
    { status }
  )
}
