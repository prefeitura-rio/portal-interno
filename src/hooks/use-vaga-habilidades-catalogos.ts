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
  areasAtuacaoCompleto: () =>
    [...vagaHabilidadesKeys.all, 'areas-atuacao', 'completo'] as const,
  conhecimentosCompleto: (areaId: number | null | undefined) =>
    [...vagaHabilidadesKeys.all, 'conhecimentos', areaId, 'completo'] as const,
  comportamentosAtitudesCompleto: () =>
    [
      ...vagaHabilidadesKeys.all,
      'comportamentos-atitudes',
      'completo',
    ] as const,
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

// ============================================
// Catálogo inteiro (DEV-526): o bloco "Habilidades e competências" mostra
// todas as opções no multi-select, então lê todas as páginas da lista.
// ============================================

/** Maior página que a rota aceita: menos idas ao BFF para o catálogo todo. */
export const CATALOGO_COMPLETO_PAGE_SIZE = 100
/** Trava contra laço: 20 páginas de 100 cobrem qualquer catálogo real. */
const CATALOGO_COMPLETO_MAX_PAGINAS = 20

export async function fetchCatalogoCompleto(
  path: string,
  signal: AbortSignal
): Promise<CatalogoHabilidadesPage> {
  const data: CatalogoHabilidadesPage['data'] = []
  const vistos = new Set<number>()
  let total = 0
  for (let page = 1; page <= CATALOGO_COMPLETO_MAX_PAGINAS; page++) {
    const pagina = await fetchCatalogo(
      catalogoUrl(path, { page, pageSize: CATALOGO_COMPLETO_PAGE_SIZE }),
      signal
    )
    total = pagina.meta.total
    for (const item of pagina.data) {
      if (vistos.has(item.id)) continue
      vistos.add(item.id)
      data.push(item)
    }
    if (
      pagina.data.length < CATALOGO_COMPLETO_PAGE_SIZE ||
      data.length >= total
    )
      break
  }
  return {
    data,
    meta: {
      page: 1,
      page_size: data.length,
      total: Math.max(total, data.length),
    },
  }
}

/** Todas as áreas de atuação, em uma lista só. */
export function useAreasAtuacaoCompleto() {
  return useQuery({
    queryKey: vagaHabilidadesKeys.areasAtuacaoCompleto(),
    queryFn: ({ signal }) =>
      fetchCatalogoCompleto('/api/empregabilidade/areas-atuacao', signal),
    staleTime: CATALOGO_STALE_TIME_MS,
  })
}

/** Todos os conhecimentos de uma área; desligado enquanto não há área. */
export function useConhecimentosDaAreaCompleto(
  areaId: number | null | undefined
) {
  const enabled =
    typeof areaId === 'number' && Number.isSafeInteger(areaId) && areaId > 0
  return useQuery({
    queryKey: vagaHabilidadesKeys.conhecimentosCompleto(areaId),
    queryFn: ({ signal }) =>
      fetchCatalogoCompleto(
        `/api/empregabilidade/areas-atuacao/${areaId}/conhecimentos`,
        signal
      ),
    enabled,
    staleTime: CATALOGO_STALE_TIME_MS,
  })
}

/** Todos os comportamentos e atitudes, em uma lista só. */
export function useComportamentosAtitudesCompleto() {
  return useQuery({
    queryKey: vagaHabilidadesKeys.comportamentosAtitudesCompleto(),
    queryFn: ({ signal }) =>
      fetchCatalogoCompleto(
        '/api/empregabilidade/comportamentos-atitudes',
        signal
      ),
    staleTime: CATALOGO_STALE_TIME_MS,
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
