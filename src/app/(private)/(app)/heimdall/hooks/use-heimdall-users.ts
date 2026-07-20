'use client'

import type {
  PaginatedResponseUserResponse,
  UserResponse,
} from '@/http-heimdall/models'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export function useHeimdallUsers({
  skip,
  limit,
}: {
  skip: number
  limit: number
}) {
  return useQuery({
    queryKey: heimdallKeys.users(skip, limit),
    queryFn: () =>
      fetchHeimdallApi<PaginatedResponseUserResponse>(
        `/api/heimdall/usuarios?skip=${skip}&limit=${limit}`
      ),
    placeholderData: keepPreviousData,
  })
}

export function useHeimdallUserByCpf(cpf: string) {
  const isValidCpf = /^\d{11}$/.test(cpf)

  return useQuery({
    queryKey: heimdallKeys.userByCpf(cpf),
    queryFn: () =>
      fetchHeimdallApi<UserResponse>(`/api/heimdall/usuarios/${cpf}`),
    enabled: isValidCpf,
  })
}
