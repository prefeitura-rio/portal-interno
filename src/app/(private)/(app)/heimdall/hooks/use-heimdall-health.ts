'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'
import type { HeimdallHealthStatus } from './use-heimdall-dashboard'

export interface CerbosPolicyTemplate {
  apiVersion?: string
  kind?: string
  metadata?: {
    storeIdentifier?: string
  }
  rolePolicy?: {
    role?: string
    version?: string
    rules?: Array<{
      resource: string
      actions: Array<{
        action: string
        effect: string
      }>
    }>
  }
  [key: string]: unknown
}

export function useHeimdallReadyz() {
  return useQuery({
    queryKey: heimdallKeys.readyz(),
    queryFn: () =>
      fetchHeimdallApi<HeimdallHealthStatus>('/api/heimdall/readyz'),
    retry: false,
  })
}

export function useHeimdallCerbosPolicyTemplate() {
  return useQuery({
    queryKey: heimdallKeys.cerbosPolicyTemplate(),
    queryFn: () =>
      fetchHeimdallApi<CerbosPolicyTemplate>(
        '/api/heimdall/cerbos-policy-template'
      ),
    retry: false,
  })
}

export function useRefreshHeimdallHealth() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: heimdallKeys.healthz() }),
      queryClient.invalidateQueries({ queryKey: heimdallKeys.readyz() }),
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.cerbosPolicyTemplate(),
      }),
    ])
}

/**
 * Normaliza dependências vindas de `dependencies` (strings) ou `checks` (booleanos).
 */
export function getDependencyEntries(
  status: HeimdallHealthStatus | undefined
): Array<{ name: string; healthy: boolean; label: string }> {
  if (!status) return []

  if (status.dependencies && typeof status.dependencies === 'object') {
    return Object.entries(status.dependencies)
      .filter(([key]) => key !== 'overall')
      .map(([name, value]) => ({
        name,
        healthy: value === 'healthy' || value === 'ready',
        label: String(value),
      }))
  }

  if (status.checks && typeof status.checks === 'object') {
    return Object.entries(status.checks)
      .filter(([key]) => key !== 'overall')
      .map(([name, value]) => ({
        name,
        healthy: Boolean(value),
        label: value ? 'healthy' : 'unhealthy',
      }))
  }

  return []
}
