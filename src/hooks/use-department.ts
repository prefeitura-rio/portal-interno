'use client'

import { loadDepartment, normalizeCdUa } from '@/lib/department-client'
import type { Department } from '@/types/department'
import { queryOptions, useQuery } from '@tanstack/react-query'

/** Órgãos quase não mudam; evita refetch ao voltar para a listagem. */
const DEPARTMENT_DETAIL_STALE_TIME_MS = 60 * 60 * 1000

/** Mantém o nome na sessão mesmo depois de sair da tela. */
const DEPARTMENT_DETAIL_GC_TIME_MS = 6 * 60 * 60 * 1000

export function departmentDetailQueryKey(cdUa: string) {
  return ['departments', 'detail', cdUa.trim()] as const
}

export class DepartmentLookupError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'DepartmentLookupError'
    this.status = status
  }
}

function isDefinitiveDepartmentError(error: unknown): boolean {
  return (
    error instanceof DepartmentLookupError &&
    (error.status === 400 || error.status === 404)
  )
}

/**
 * Busca um órgão pelo cd_ua via `loadDepartment` (dedupe e cache de 404 na
 * aba). 404 e id inválido rejeitam com `DepartmentLookupError` e não devem
 * ser tentados de novo.
 */
export async function fetchDepartment(cdUa: string): Promise<Department> {
  const normalizedId = normalizeCdUa(cdUa)

  if (!normalizedId) {
    throw new DepartmentLookupError('Invalid department id', 400)
  }

  try {
    const result = await loadDepartment(normalizedId)
    if (result.status === 'not_found') {
      throw new DepartmentLookupError('Department not found', 404)
    }
    return result.data
  } catch (error) {
    if (error instanceof DepartmentLookupError) {
      if (error.status !== 404) {
        console.error('Error fetching department:', error)
      }
      throw error
    }
    console.error('Error fetching department:', error)
    throw new DepartmentLookupError(
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}

export function departmentDetailQueryOptions(cdUa: string) {
  const normalizedId = cdUa.trim()

  return queryOptions({
    queryKey: departmentDetailQueryKey(normalizedId),
    queryFn: () => fetchDepartment(normalizedId),
    staleTime: DEPARTMENT_DETAIL_STALE_TIME_MS,
    gcTime: DEPARTMENT_DETAIL_GC_TIME_MS,
    retry: (failureCount, error) => {
      if (isDefinitiveDepartmentError(error)) return false
      return failureCount < 1
    },
  })
}

export function useDepartment(cd_ua: string | null | undefined) {
  const trimmed = cd_ua?.trim() ?? ''
  const normalizedId = normalizeCdUa(trimmed)

  const query = useQuery({
    ...departmentDetailQueryOptions(trimmed),
    enabled: normalizedId !== null,
  })

  const refetch = () => {
    if (!normalizedId) return
    void query.refetch()
  }

  if (!trimmed) {
    return {
      department: null,
      loading: false,
      error: null,
      refetch,
    }
  }

  if (!normalizedId) {
    return {
      department: null,
      loading: false,
      error: 'Invalid department id',
      refetch,
    }
  }

  return {
    department: query.data ?? null,
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Unknown error'
      : null,
    refetch,
  }
}
