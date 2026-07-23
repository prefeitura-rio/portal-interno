'use client'

import type { HeimdallCompareResult } from '@/lib/heimdall-compare'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export interface HeimdallCompareConfig {
  currentBaseUrl: string
  currentLabel: 'produção' | 'staging' | 'desconhecido'
  suggestedCompareBaseUrl: string
  prodBaseUrl: string
  stagingBaseUrl: string
}

export interface HeimdallCompareRequest {
  compareBaseUrl: string
  compareJwt: string
}

export function useHeimdallCompareConfig() {
  return useQuery({
    queryKey: [...heimdallKeys.all, 'compare', 'config'] as const,
    queryFn: () =>
      fetchHeimdallApi<HeimdallCompareConfig>('/api/heimdall/comparar'),
    staleTime: 60_000,
  })
}

export function useHeimdallCompare() {
  return useMutation({
    mutationFn: (body: HeimdallCompareRequest) =>
      fetchHeimdallApi<HeimdallCompareResult>('/api/heimdall/comparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  })
}
