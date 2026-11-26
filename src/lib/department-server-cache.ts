/**
 * Cache do BFF `/api/departments/[cd_ua]` (DEV-818).
 *
 * Cada chamada a esta rota virava uma consulta à RMI, saindo do cluster pelo
 * IP de NAT compartilhado: recargas, abas e usuários diferentes pedindo o
 * mesmo órgão somavam requisições até o limite de taxa do Cloud Armor. Aqui a
 * resposta da RMI fica no processo do servidor (órgão não depende de quem
 * pede) e consultas simultâneas ao mesmo `cd_ua` compartilham uma só chamada.
 *
 * Fica no cache só resposta definitiva: 200 (`DEPARTMENT_FOUND_TTL_MS`) e
 * 404 (`DEPARTMENT_NOT_FOUND_TTL_MS`). 5xx, 429, outro status e erro de rede
 * não ficam: a próxima chamada consulta de novo. Este módulo não depende do
 * Next: recebe a chamada à RMI como função, para ser testado com respostas
 * sintéticas.
 */

import { DedupedTtlCache } from './department-lookup-cache'
import {
  DEPARTMENT_CACHE_MAX_ENTRIES,
  DEPARTMENT_FOUND_TTL_MS,
  DEPARTMENT_NOT_FOUND_TTL_MS,
  isValidCdUa,
} from './department-names'

/** O que a rota usa da resposta da RMI (formato dos clientes Orval). */
export interface DepartmentRmiResponse {
  status: number
  data: unknown
}

export type FetchDepartmentFromRmi = (
  cdUa: string
) => Promise<DepartmentRmiResponse>

function ttlForStatus(response: DepartmentRmiResponse): number {
  if (response.status === 200) return DEPARTMENT_FOUND_TTL_MS
  if (response.status === 404) return DEPARTMENT_NOT_FOUND_TTL_MS
  return 0
}

export function createDepartmentServerCache(
  now: () => number = Date.now,
  maxEntries = DEPARTMENT_CACHE_MAX_ENTRIES
): DedupedTtlCache<DepartmentRmiResponse> {
  return new DedupedTtlCache<DepartmentRmiResponse>({
    ttlMs: ttlForStatus,
    maxEntries,
    now,
  })
}

/** Cache do processo do servidor, compartilhado por todas as requisições. */
export const departmentServerCache = createDepartmentServerCache()

/**
 * Resposta da RMI para o `cd_ua`: do cache, da consulta em voo ou de uma
 * consulta nova. Código que não é cd_ua numérico vai direto à RMI, como
 * antes, sem ocupar o cache.
 */
export async function getDepartmentCached(
  cdUa: string,
  fetchDepartment: FetchDepartmentFromRmi,
  cache: DedupedTtlCache<DepartmentRmiResponse> = departmentServerCache
): Promise<DepartmentRmiResponse> {
  if (!isValidCdUa(cdUa)) return fetchDepartment(cdUa)
  return cache.load(cdUa, async () => {
    const response = await fetchDepartment(cdUa)
    // Guarda só o que a rota usa (sem `headers` da resposta)
    return { status: response.status, data: response.data }
  })
}
