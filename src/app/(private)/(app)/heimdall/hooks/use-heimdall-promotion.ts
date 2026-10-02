'use client'

import type {
  HeimdallPromotionPreview,
  HeimdallPromotionResult,
} from '@/lib/heimdall-promotion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export interface HeimdallPromotionApplyRequest {
  /** "entity:key" de cada item selecionado */
  items: string[]
  release: string | null
  planHash: string
}

/** Prévia em produção dos itens ("entity:key") vindos do link do release. */
export function useHeimdallPromotionPlan(
  items: string[],
  release: string | null
) {
  return useQuery({
    queryKey: [...heimdallKeys.all, 'promotion', release, [...items].sort()],
    queryFn: () =>
      fetchHeimdallApi<HeimdallPromotionPreview>(
        '/api/heimdall/promocao/plano',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, release }),
        }
      ),
    enabled: items.length > 0,
  })
}

export function useHeimdallPromotionApply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: HeimdallPromotionApplyRequest) =>
      fetchHeimdallApi<HeimdallPromotionResult>(
        '/api/heimdall/promocao/aplicar',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      ),
    // Sucesso ou conflito (409): a prévia precisa ser recalculada.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.all })
    },
  })
}
