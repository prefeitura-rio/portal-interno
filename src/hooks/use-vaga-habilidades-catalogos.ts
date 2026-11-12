'use client'

import type { CatalogoHabilidadesPage } from '@/lib/vaga-habilidades'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

/** Filtros das listas de catálogo (todos opcionais; a API pagina de 20 em 20). */
export interface CatalogoHabilidadesFiltros {
  q?: string
  page?: number
  pageSize?: number
}

export const vagaHabilidadesKeys = {
  all: ['empregabilidade', 'habilidades-vaga'] as const,
  areasAtuacao: (filtros: CatalogoHabilidadesFiltros) =>
    [...vagaHabilidadesKeys.all, 'areas-atuacao', filtros] as const,
  conhecimentos: (
    areaId: number | null | undefined,
    filtros: CatalogoHabilidadesFiltros
  ) => [...vagaHabilidadesKeys.all, 'conhecimentos', areaId, filtros] as const,
  comportamentosAtitudes: (filtros: CatalogoHabilidadesFiltros) =>
    [...vagaHabilidadesKeys.all, 'comportamentos-atitudes', filtros] as const,
}

/** Catálogos mudam pouco: evita refazer a busca a cada foco ou montagem. */
const CATALOGO_STALE_TIME_MS = 5 * 60 * 1000

function catalogoUrl(path: string, filtros: CatalogoHabilidadesFiltros) {
  const search = new URLSearchParams()
  const q = filtros.q?.trim()
  if (q) search.set('q', q)
  if (filtros.page !== undefined) search.set('page', String(filtros.page))
  if (filtros.pageSize !== undefined) {
    search.set('pageSize', String(filtros.pageSize))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

async function fetchCatalogo(
  url: string,
  signal: AbortSignal
): Promise<CatalogoHabilidadesPage> {
  const response = await fetch(url, { signal })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Erro ${response.status} ao buscar ${url}`
    throw new Error(error)
  }
  return body as CatalogoHabilidadesPage
}

/** Áreas de atuação (GET /api/empregabilidade/areas-atuacao). */
export function useAreasAtuacao(filtros: CatalogoHabilidadesFiltros = {}) {
  return useQuery({
    queryKey: vagaHabilidadesKeys.areasAtuacao(filtros),
    queryFn: ({ signal }) =>
      fetchCatalogo(
        catalogoUrl('/api/empregabilidade/areas-atuacao', filtros),
        signal
      ),
    staleTime: CATALOGO_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  })
}

/**
 * Conhecimentos de uma área (GET
 * /api/empregabilidade/areas-atuacao/{id}/conhecimentos). Desligado enquanto
 * nenhuma área foi escolhida.
 */
export function useConhecimentosDaArea(
  areaId: number | null | undefined,
  filtros: CatalogoHabilidadesFiltros = {}
) {
  const enabled =
    typeof areaId === 'number' && Number.isSafeInteger(areaId) && areaId > 0
  return useQuery({
    queryKey: vagaHabilidadesKeys.conhecimentos(areaId, filtros),
    queryFn: ({ signal }) =>
      fetchCatalogo(
        catalogoUrl(
          `/api/empregabilidade/areas-atuacao/${areaId}/conhecimentos`,
          filtros
        ),
        signal
      ),
    enabled,
    staleTime: CATALOGO_STALE_TIME_MS,
    // Mantém a página anterior só ao paginar ou buscar na mesma área: ao
    // trocar de área, não mostra os conhecimentos da outra.
    placeholderData: (anterior, consultaAnterior) =>
      consultaAnterior?.queryKey[3] === areaId ? anterior : undefined,
  })
}

/** Comportamentos e atitudes (GET /api/empregabilidade/comportamentos-atitudes). */
export function useComportamentosAtitudes(
  filtros: CatalogoHabilidadesFiltros = {}
) {
  return useQuery({
    queryKey: vagaHabilidadesKeys.comportamentosAtitudes(filtros),
    queryFn: ({ signal }) =>
      fetchCatalogo(
        catalogoUrl('/api/empregabilidade/comportamentos-atitudes', filtros),
        signal
      ),
    staleTime: CATALOGO_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  })
}
