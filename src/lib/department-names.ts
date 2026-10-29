/**
 * Nomes de secretarias (órgãos da RMI) resolvidos no servidor, em lote
 * controlado (DEV-100).
 *
 * A RMI limita a taxa de `GET /departments/{cd_ua}`: o Dashboard de
 * Capacitações pedia o nome de cada secretaria do navegador, todas ao mesmo
 * tempo, e recebia 429 em quase todas. Aqui as consultas saem do BFF, com no
 * máximo `concurrency` simultâneas, nova tentativa em 429/5xx/erro de rede
 * (respeitando `Retry-After`) e cache em memória entre as cargas.
 *
 * Este módulo não depende do Next: recebe a chamada à RMI como função, para
 * ser testado com respostas sintéticas.
 */

export type DepartmentLookup =
  | { status: 'found'; nome: string; sigla: string | null }
  /** A RMI não conhece o código (404/400) ou o código não é um cd_ua. */
  | { status: 'not_found' }
  /** A RMI não respondeu a tempo (limite de taxa, erro, prazo esgotado). */
  | { status: 'unavailable' }

/** Resposta de uma chamada à RMI (formato dos clientes Orval). */
export interface DepartmentApiResult {
  status: number
  data: unknown
  headers?: Headers | null
}

export type FetchDepartment = (cdUa: string) => Promise<DepartmentApiResult>

/** Consultas simultâneas à RMI. */
export const DEPARTMENT_NAME_CONCURRENCY = 2

/** Tentativas por código (a primeira e as novas tentativas). */
export const DEPARTMENT_NAME_MAX_ATTEMPTS = 4

/** Espera antes da 2ª tentativa; dobra a cada nova tentativa. */
export const DEPARTMENT_NAME_BASE_DELAY_MS = 500

/** Maior espera entre tentativas, também para `Retry-After`. */
export const DEPARTMENT_NAME_MAX_DELAY_MS = 5_000

/** Tempo total para resolver os nomes de uma carga do dashboard. */
export const DEPARTMENT_NAME_DEADLINE_MS = 20_000

/** Validade do nome encontrado no cache (órgãos quase nunca mudam). */
export const DEPARTMENT_FOUND_TTL_MS = 6 * 60 * 60 * 1000

/** Validade do "não encontrado" no cache. */
export const DEPARTMENT_NOT_FOUND_TTL_MS = 30 * 60 * 1000

/** Limite de códigos guardados no cache. */
export const DEPARTMENT_CACHE_MAX_ENTRIES = 2_000

/**
 * cd_ua é numérico (o mesmo critério de `useDepartment`). O código vai no
 * caminho da URL da RMI sem codificação, então nada além de dígitos passa.
 */
export function isValidCdUa(value: string): boolean {
  return /^\d{1,20}$/.test(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Lê o órgão da resposta 200 da RMI (aceita também o corpo embrulhado em
 * `data`). Sem `nome_ua`, mostra o próprio código, como `DepartmentName`.
 * Corpo que não é objeto é resposta inválida (`null`).
 */
export function parseDepartment(
  body: unknown,
  cdUa: string
): { nome: string; sigla: string | null } | null {
  const record = asRecord(body)
  if (!record) return null
  const department = asRecord(record.data) ?? record
  return {
    nome: nonEmptyString(department.nome_ua) ?? cdUa,
    sigla: nonEmptyString(department.sigla_ua),
  }
}

/**
 * `Retry-After` em milissegundos: segundos inteiros ou data HTTP. `null`
 * quando ausente ou inválido.
 */
export function parseRetryAfterMs(
  headers: Headers | null | undefined,
  now: number
): number | null {
  const value = headers?.get('retry-after')?.trim()
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value) * 1000
  const date = Date.parse(value)
  if (Number.isNaN(date)) return null
  return Math.max(0, date - now)
}

interface CacheEntry {
  lookup: DepartmentLookup
  expiresAt: number
}

/**
 * Cache dos nomes entre as cargas do dashboard. Guarda só respostas
 * definitivas (encontrado e não encontrado); falha temporária não fica.
 */
export class DepartmentNameCache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly now: () => number
  private readonly maxEntries: number

  constructor(
    now: () => number = Date.now,
    maxEntries = DEPARTMENT_CACHE_MAX_ENTRIES
  ) {
    this.now = now
    this.maxEntries = maxEntries
  }

  get(cdUa: string): DepartmentLookup | null {
    const entry = this.entries.get(cdUa)
    if (!entry) return null
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(cdUa)
      return null
    }
    return entry.lookup
  }

  set(cdUa: string, lookup: DepartmentLookup): void {
    if (lookup.status === 'unavailable') return
    const ttl =
      lookup.status === 'found'
        ? DEPARTMENT_FOUND_TTL_MS
        : DEPARTMENT_NOT_FOUND_TTL_MS
    this.entries.delete(cdUa)
    this.entries.set(cdUa, { lookup, expiresAt: this.now() + ttl })
    // Map guarda a ordem de inserção: o primeiro é o mais antigo
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }

  get size(): number {
    return this.entries.size
  }
}

/** Cache do processo do servidor, compartilhado pelas cargas do dashboard. */
export const departmentNameCache = new DepartmentNameCache()

export interface ResolveDepartmentNamesOptions {
  cache?: DepartmentNameCache
  concurrency?: number
  maxAttempts?: number
  deadlineMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * Nome de cada secretaria, com no máximo `concurrency` consultas à RMI ao
 * mesmo tempo. 429, 5xx e erro de rede tentam de novo depois de
 * `Retry-After` (ou de um recuo exponencial), até `maxAttempts` ou até o
 * prazo da carga; o que não resolver fica `unavailable` (e, esgotado o
 * prazo, os códigos restantes não são consultados). Códigos repetidos são
 * consultados uma vez.
 */
export async function resolveDepartmentNames(
  cdUas: readonly string[],
  fetchDepartment: FetchDepartment,
  options: ResolveDepartmentNamesOptions = {}
): Promise<Map<string, DepartmentLookup>> {
  const cache = options.cache ?? departmentNameCache
  const concurrency = options.concurrency ?? DEPARTMENT_NAME_CONCURRENCY
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? DEPARTMENT_NAME_MAX_ATTEMPTS
  )
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const deadline = now() + (options.deadlineMs ?? DEPARTMENT_NAME_DEADLINE_MS)

  const result = new Map<string, DepartmentLookup>()
  const pending: string[] = []

  for (const cdUa of new Set(cdUas)) {
    if (!isValidCdUa(cdUa)) {
      result.set(cdUa, { status: 'not_found' })
      continue
    }
    const cached = cache.get(cdUa)
    if (cached) {
      result.set(cdUa, cached)
    } else {
      pending.push(cdUa)
    }
  }

  // Quando uma espera passaria do prazo, a RMI segue limitando e não há
  // tempo para esperar: os códigos restantes nem são consultados
  let outOfTime = false

  async function lookup(cdUa: string): Promise<DepartmentLookup> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (outOfTime || now() >= deadline) {
        outOfTime = true
        return { status: 'unavailable' }
      }

      let retryAfterMs: number | null = null
      try {
        const response = await fetchDepartment(cdUa)
        if (response.status >= 200 && response.status < 300) {
          const department = parseDepartment(response.data, cdUa)
          return department
            ? { status: 'found', ...department }
            : { status: 'unavailable' }
        }
        if (response.status === 404 || response.status === 400) {
          return { status: 'not_found' }
        }
        if (!isRetryable(response.status)) return { status: 'unavailable' }
        retryAfterMs = parseRetryAfterMs(response.headers, now())
      } catch {
        // Erro de rede: tenta de novo como um 5xx
      }

      if (attempt === maxAttempts) break
      const delay = Math.min(
        retryAfterMs ?? DEPARTMENT_NAME_BASE_DELAY_MS * 2 ** (attempt - 1),
        DEPARTMENT_NAME_MAX_DELAY_MS
      )
      if (now() + delay >= deadline) {
        outOfTime = true
        break
      }
      await sleep(delay)
    }
    return { status: 'unavailable' }
  }

  let next = 0
  async function worker(): Promise<void> {
    while (next < pending.length) {
      const cdUa = pending[next]
      next += 1
      const found = await lookup(cdUa)
      cache.set(cdUa, found)
      result.set(cdUa, found)
    }
  }

  const workers = Math.max(1, Math.min(concurrency, pending.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return result
}
