/**
 * Cache de consultas de órgãos (RMI) com dedupe da consulta em voo (DEV-818).
 *
 * Uma tabela monta várias linhas com o mesmo `cd_ua` no mesmo ciclo de
 * render: um cache escrito só depois que a resposta chega não impede que
 * cada linha dispare a própria consulta. Aqui a primeira chamada de uma chave
 * guarda a promise e as seguintes, enquanto ela não resolve, recebem a mesma
 * promise; o resultado fica no cache pelo tempo que `ttlMs` disser.
 *
 * Erro (promise rejeitada) não fica no cache: a próxima chamada consulta de
 * novo. Este módulo não depende do React nem do Next, para ser usado no
 * navegador (`useDepartment`) e no BFF (`/api/departments/[cd_ua]`) e testado
 * com consultas sintéticas.
 */

export interface DedupedTtlCacheOptions<T> {
  /**
   * Validade de um resultado em milissegundos; `0` ou menos não guarda (a
   * consulta ainda é compartilhada enquanto está em voo).
   */
  ttlMs: (value: T) => number
  /** Limite de chaves guardadas; a mais antiga sai primeiro. */
  maxEntries: number
  now?: () => number
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class DedupedTtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()
  private readonly inFlight = new Map<string, Promise<T>>()
  private readonly ttlMs: (value: T) => number
  private readonly maxEntries: number
  private readonly now: () => number

  constructor(options: DedupedTtlCacheOptions<T>) {
    this.ttlMs = options.ttlMs
    this.maxEntries = Math.max(1, options.maxEntries)
    this.now = options.now ?? Date.now
  }

  /** Resultado ainda válido da chave, sem consultar. */
  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * Resultado da chave: o do cache, o da consulta já em voo ou o de uma
   * consulta nova feita por `loader`.
   */
  load(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) return Promise.resolve(cached)

    const pending = this.inFlight.get(key)
    if (pending) return pending

    const request = (async () => {
      try {
        const value = await loader()
        this.store(key, value)
        return value
      } finally {
        this.inFlight.delete(key)
      }
    })()
    this.inFlight.set(key, request)
    return request
  }

  /** Esquece a chave (o resultado guardado; a consulta em voo segue). */
  delete(key: string): void {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
    this.inFlight.clear()
  }

  get size(): number {
    return this.entries.size
  }

  get inFlightCount(): number {
    return this.inFlight.size
  }

  private store(key: string, value: T): void {
    const ttl = this.ttlMs(value)
    this.entries.delete(key)
    if (!(ttl > 0)) return
    this.entries.set(key, { value, expiresAt: this.now() + ttl })
    // Map guarda a ordem de inserção: o primeiro é o mais antigo
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
}
