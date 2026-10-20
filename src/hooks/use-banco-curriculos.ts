'use client'

import type {
  EmpregabilidadeAssociarVagasResponse,
  EmpregabilidadeBancoCurriculoCandidaturaListResponse,
  EmpregabilidadeBancoCurriculoDetalhe,
  EmpregabilidadeBancoCurriculoListResponse,
} from '@/http-gorio/models'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

export interface BancoCurriculosListParams {
  page: number
  pageSize: number
  search?: string
  /** Filtros avançados, já como parâmetros da API. */
  filtro?: Record<string, string>
}

interface BancoCurriculosFetchError extends Error {
  status: number
  /** O que falta no currículo quando a associação é recusada (422). */
  pendencias?: string[]
}

export const bancoCurriculosKeys = {
  all: ['banco-curriculos'] as const,
  list: (params: BancoCurriculosListParams) =>
    [...bancoCurriculosKeys.all, 'list', params] as const,
  detalhe: (cpf: string) =>
    [...bancoCurriculosKeys.all, 'detalhe', cpf] as const,
  candidaturas: (cpf: string, params: BancoCurriculosListParams) =>
    [...bancoCurriculosKeys.detalhe(cpf), 'candidaturas', params] as const,
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
      for (const [chave, valor] of Object.entries(params.filtro ?? {})) {
        query.set(chave, valor)
      }

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
    // Só vale tentar de novo em falha do servidor: CPF inválido (400) ou sem
    // currículo (404) dariam a mesma resposta.
    retry: (failureCount, error) => {
      const status = getBancoCurriculosErrorStatus(error)
      return (status === null || status >= 500) && failureCount < 1
    },
  })
}

export function useBancoCurriculoCandidaturas(
  cpf: string,
  params: BancoCurriculosListParams
) {
  return useQuery({
    queryKey: bancoCurriculosKeys.candidaturas(cpf, params),
    queryFn: () => {
      const query = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      })
      if (params.search) query.set('search', params.search)

      return fetchBancoCurriculos<EmpregabilidadeBancoCurriculoCandidaturaListResponse>(
        `/api/empregabilidade/banco-curriculos/${encodeURIComponent(cpf)}/candidaturas?${query}`
      )
    },
    enabled: !!cpf,
    placeholderData: keepPreviousData,
  })
}

/**
 * Associa o candidato às vagas. A resposta traz o resultado de cada vaga; o
 * histórico de candidaturas é recarregado em seguida.
 */
export function useAssociarVagas(cpf: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idsVagas: string[]) =>
      fetchBancoCurriculos<EmpregabilidadeAssociarVagasResponse>(
        `/api/empregabilidade/banco-curriculos/${encodeURIComponent(cpf)}/associacoes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids_vagas: idsVagas }),
        }
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [...bancoCurriculosKeys.detalhe(cpf), 'candidaturas'],
      }),
  })
}

/** O que falta no currículo quando a associação foi recusada. */
export function getPendenciasDoCurriculo(error: unknown): string[] {
  if (error && typeof error === 'object' && 'pendencias' in error) {
    return (error as BancoCurriculosFetchError).pendencias ?? []
  }
  return []
}

/** Status HTTP da falha, para a tela diferenciar "não encontrado" de erro. */
export function getBancoCurriculosErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as BancoCurriculosFetchError).status
  }
  return null
}

async function fetchBancoCurriculos<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      body?.error ?? 'Erro ao carregar o banco de currículos'
    ) as BancoCurriculosFetchError
    error.status = response.status
    if (Array.isArray(body?.pendencias)) error.pendencias = body.pendencias
    throw error
  }

  return body as T
}
