'use client'

import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import { shouldBypassSecretariaFilter } from '@/types/heimdall-roles'
import { useQuery } from '@tanstack/react-query'

interface MeSecretariasResponse {
  data?: {
    cd_uas: string[] | null
    bypass?: boolean
  }
  success?: boolean
  error?: string
}

async function fetchMeSecretarias(): Promise<{
  cd_uas: string[]
  bypass: boolean
}> {
  const response = await fetch('/api/me/secretarias')

  if (!response.ok) {
    throw new Error('Falha ao carregar secretarias do usuário')
  }

  const body = (await response.json()) as MeSecretariasResponse

  if (body.data?.bypass) {
    return { cd_uas: [], bypass: true }
  }

  return {
    cd_uas: body.data?.cd_uas ?? [],
    bypass: false,
  }
}

export function useRestrictedDepartmentIds() {
  const { user, loading: userLoading } = useHeimdallUserContext()
  const bypass = shouldBypassSecretariaFilter(user?.roles)

  const {
    data,
    isLoading: secretariasLoading,
    error,
  } = useQuery({
    queryKey: ['me', 'secretarias'],
    queryFn: fetchMeSecretarias,
    enabled: !userLoading && !bypass && Boolean(user),
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = userLoading || (!bypass && secretariasLoading)
  const isRestricted = !bypass
  const cdUas = bypass ? [] : (data?.cd_uas ?? [])
  const hasNoSecretarias = isRestricted && !isLoading && cdUas.length === 0

  return {
    restrictToIds: bypass ? undefined : isLoading ? [] : cdUas,
    isRestricted,
    isLoading,
    cdUas,
    bypass,
    hasNoSecretarias,
    error: error instanceof Error ? error.message : null,
  }
}
