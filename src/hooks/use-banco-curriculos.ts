'use client'

import type {
  EmpregabilidadeBancoCurriculoDetalhe,
  EmpregabilidadeBancoCurriculoListResponse,
} from '@/http-gorio/models'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

export interface BancoCurriculosListParams {
  page: number
  pageSize: number
  search?: string
}

interface BancoCurriculosFetchError extends Error {
  status: number
}

export const bancoCurriculosKeys = {
  all: ['banco-curriculos'] as const,
  list: (params: BancoCurriculosListParams) =>
    [...bancoCurriculosKeys.all, 'list', params] as const,
  detalhe: (cpf: string) =>
    [...bancoCurriculosKeys.all, 'detalhe', cpf] as const,
}

export function useBancoCurriculos(params: BancoCurriculosListParams) {
  return useQuery({
    queryKey: bancoCurriculosKeys.list(params),
    queryFn: () => {
      const query = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      })
      if (params.search) query.set('search', params.search)

      return fetchBancoCurriculos<EmpregabilidadeBancoCurriculoListResponse>(
        `/api/empregabilidade/banco-curriculos?${query}`
      )
    },
    placeholderData: keepPreviousData,
  })
}

export function useBancoCurriculo(cpf: string) {
  return useQuery({
    queryKey: bancoCurriculosKeys.detalhe(cpf),
    queryFn: () =>
      fetchBancoCurriculos<EmpregabilidadeBancoCurriculoDetalhe>(
        `/api/empregabilidade/banco-curriculos/${encodeURIComponent(cpf)}`
      ),
    enabled: !!cpf,
    retry: (failureCount, error) =>
      getBancoCurriculosErrorStatus(error) !== 404 && failureCount < 1,
  })
}

/** Status HTTP da falha, para a tela diferenciar "não encontrado" de erro. */
export function getBancoCurriculosErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as BancoCurriculosFetchError).status
  }
  return null
}

async function fetchBancoCurriculos<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      body?.error ?? 'Erro ao carregar o banco de currículos'
    ) as BancoCurriculosFetchError
    error.status = response.status
    throw error
  }

  return body as T
}
