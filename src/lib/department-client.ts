import type { Department } from '@/types/department'
import { DedupedTtlCache } from './department-lookup-cache'

/**
 * Consulta de um órgão pelo navegador, via BFF `/api/departments/[cd_ua]`
 * (DEV-818). Todas as linhas que pedem o mesmo `cd_ua` ao mesmo tempo
 * compartilham uma única requisição, e o resultado (encontrado ou não
 * encontrado) fica guardado por `DEPARTMENT_CLIENT_TTL_MS`. Falha da
 * requisição não fica guardada: a próxima montagem tenta de novo.
 */

export type DepartmentClientResult =
  | { status: 'found'; data: Department }
  | { status: 'not_found' }

/** Validade de um resultado no navegador. */
export const DEPARTMENT_CLIENT_TTL_MS = 5 * 60 * 1000

/** Limite de órgãos guardados no navegador. */
export const DEPARTMENT_CLIENT_CACHE_MAX_ENTRIES = 500

export class DepartmentFetchError extends Error {}

export type DepartmentFetcher = (url: string) => Promise<Response>

/** cd_ua é numérico; o resto não chega a ser consultado. */
export function normalizeCdUa(value: string): string | null {
  const normalized = value.trim()
  return /^\d+$/.test(normalized) ? normalized : null
}

export function createDepartmentClientCache(
  now: () => number = Date.now
): DedupedTtlCache<DepartmentClientResult> {
  return new DedupedTtlCache<DepartmentClientResult>({
    ttlMs: () => DEPARTMENT_CLIENT_TTL_MS,
    maxEntries: DEPARTMENT_CLIENT_CACHE_MAX_ENTRIES,
    now,
  })
}

/** Cache da aba, compartilhado por todos os `useDepartment`. */
export const departmentClientCache = createDepartmentClientCache()

async function requestDepartment(
  cdUa: string,
  fetcher: DepartmentFetcher
): Promise<DepartmentClientResult> {
  const response = await fetcher(`/api/departments/${encodeURIComponent(cdUa)}`)

  if (response.status === 404) return { status: 'not_found' }
  if (!response.ok) throw new DepartmentFetchError('Failed to fetch department')

  const result: unknown = await response.json()
  if (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success &&
    'data' in result &&
    typeof result.data === 'object' &&
    result.data !== null
  ) {
    return { status: 'found', data: result.data as Department }
  }
  throw new DepartmentFetchError('Invalid response format')
}

/**
 * Órgão de um `cd_ua` já normalizado (`normalizeCdUa`): do cache, da
 * requisição em voo ou de uma requisição nova.
 */
export function loadDepartment(
  cdUa: string,
  options: {
    cache?: DedupedTtlCache<DepartmentClientResult>
    fetcher?: DepartmentFetcher
  } = {}
): Promise<DepartmentClientResult> {
  const cache = options.cache ?? departmentClientCache
  const fetcher = options.fetcher ?? ((url: string) => fetch(url))
  return cache.load(cdUa, () => requestDepartment(cdUa, fetcher))
}
