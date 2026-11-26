import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-818: linhas de uma tabela que montam juntas com o mesmo cd_ua disparavam
// uma requisição cada (o cache só era escrito depois da resposta). Aqui as
// consultas simultâneas de um cd_ua compartilham uma só requisição, no
// navegador e no BFF, com consultas sintéticas (sem rede).

const SRC_ROOT = new URL('../../', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    if (
      specifier.startsWith('.') &&
      !/\.[cm]?[jt]s$/.test(specifier) &&
      context.parentURL?.startsWith(SRC_ROOT.href)
    ) {
      const target = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(target))) {
        return nextResolve(target.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})

const { DedupedTtlCache } = await import('../department-lookup-cache.ts')
const {
  DEPARTMENT_CLIENT_TTL_MS,
  createDepartmentClientCache,
  loadDepartment,
  normalizeCdUa,
} = await import('../department-client.ts')
const { createDepartmentServerCache, getDepartmentCached } = await import(
  '../department-server-cache.ts'
)
const { DEPARTMENT_FOUND_TTL_MS, DEPARTMENT_NOT_FOUND_TTL_MS } = await import(
  '../department-names.ts'
)

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('DedupedTtlCache', () => {
  test('chamadas simultâneas da mesma chave compartilham uma consulta', async () => {
    const cache = new DedupedTtlCache<string>({
      ttlMs: () => 1_000,
      maxEntries: 10,
    })
    const pending = deferred<string>()
    let calls = 0
    const loader = () => {
      calls += 1
      return pending.promise
    }

    const results = Array.from({ length: 10 }, () => cache.load('4700', loader))
    assert.equal(calls, 1)
    assert.equal(cache.inFlightCount, 1)

    pending.resolve('SMTE')
    assert.deepEqual(await Promise.all(results), Array(10).fill('SMTE'))
    assert.equal(cache.inFlightCount, 0)

    assert.equal(await cache.load('4700', loader), 'SMTE')
    assert.equal(calls, 1)
  })

  test('chaves diferentes consultam cada uma', async () => {
    const cache = new DedupedTtlCache<string>({
      ttlMs: () => 1_000,
      maxEntries: 10,
    })
    const keys: string[] = []
    await Promise.all(
      ['4700', '5300', '4700', '5300'].map(key =>
        cache.load(key, async () => {
          keys.push(key)
          return key
        })
      )
    )
    assert.deepEqual(keys.sort(), ['4700', '5300'])
  })

  test('resultado expira depois do TTL', async () => {
    let now = 0
    const cache = new DedupedTtlCache<string>({
      ttlMs: () => 1_000,
      maxEntries: 10,
      now: () => now,
    })
    let calls = 0
    const loader = async () => {
      calls += 1
      return `v${calls}`
    }

    assert.equal(await cache.load('4700', loader), 'v1')
    now = 999
    assert.equal(await cache.load('4700', loader), 'v1')
    now = 1_000
    assert.equal(await cache.load('4700', loader), 'v2')
    assert.equal(calls, 2)
  })

  test('erro é compartilhado pelas chamadas em voo e não fica no cache', async () => {
    const cache = new DedupedTtlCache<string>({
      ttlMs: () => 1_000,
      maxEntries: 10,
    })
    const pending = deferred<string>()
    let calls = 0
    const loader = () => {
      calls += 1
      return pending.promise
    }

    const first = cache.load('4700', loader)
    const second = cache.load('4700', loader)
    pending.reject(new Error('rede'))
    await assert.rejects(first, /rede/)
    await assert.rejects(second, /rede/)
    assert.equal(cache.size, 0)
    assert.equal(cache.inFlightCount, 0)

    assert.equal(await cache.load('4700', async () => 'ok'), 'ok')
    assert.equal(calls, 1)
  })

  test('TTL zero compartilha a consulta em voo mas não guarda', async () => {
    const cache = new DedupedTtlCache<number>({
      ttlMs: value => (value === 200 ? 1_000 : 0),
      maxEntries: 10,
    })
    let calls = 0
    const loader = async () => {
      calls += 1
      return 503
    }
    await Promise.all([cache.load('1', loader), cache.load('1', loader)])
    assert.equal(calls, 1)
    await cache.load('1', loader)
    assert.equal(calls, 2)
    assert.equal(cache.size, 0)
  })

  test('limite de entradas tira a mais antiga', async () => {
    const cache = new DedupedTtlCache<string>({
      ttlMs: () => 1_000,
      maxEntries: 2,
    })
    for (const key of ['1', '2', '3']) {
      await cache.load(key, async () => key)
    }
    assert.equal(cache.size, 2)
    assert.equal(cache.get('1'), undefined)
    assert.equal(cache.get('2'), '2')
    assert.equal(cache.get('3'), '3')
  })
})

describe('loadDepartment (navegador)', () => {
  test('N linhas com o mesmo cd_ua montando juntas fazem 1 requisição', async () => {
    const cache = createDepartmentClientCache()
    const pending = deferred<Response>()
    const urls: string[] = []
    const fetcher = (url: string) => {
      urls.push(url)
      return pending.promise
    }

    const rows = Array.from({ length: 169 }, () =>
      loadDepartment('4700', { cache, fetcher })
    )
    assert.deepEqual(urls, ['/api/departments/4700'])

    pending.resolve(
      jsonResponse(200, {
        success: true,
        data: { cd_ua: '4700', nome_ua: 'Secretaria Sintética' },
      })
    )
    const results = await Promise.all(rows)
    for (const result of results) {
      assert.deepEqual(result, {
        status: 'found',
        data: { cd_ua: '4700', nome_ua: 'Secretaria Sintética' },
      })
    }

    await loadDepartment('4700', { cache, fetcher })
    assert.equal(urls.length, 1)
  })

  test('404 fica no cache como não encontrado', async () => {
    const cache = createDepartmentClientCache()
    let calls = 0
    const fetcher = async () => {
      calls += 1
      return jsonResponse(404, { error: 'Department not found' })
    }
    const results = await Promise.all([
      loadDepartment('9999', { cache, fetcher }),
      loadDepartment('9999', { cache, fetcher }),
    ])
    assert.deepEqual(results, [
      { status: 'not_found' },
      { status: 'not_found' },
    ])
    await loadDepartment('9999', { cache, fetcher })
    assert.equal(calls, 1)
  })

  test('falha da requisição não fica no cache', async () => {
    const cache = createDepartmentClientCache()
    let calls = 0
    const fetcher = async () => {
      calls += 1
      return calls === 1
        ? jsonResponse(500, { error: 'Internal server error' })
        : jsonResponse(200, { success: true, data: { cd_ua: '5300' } })
    }
    await assert.rejects(
      loadDepartment('5300', { cache, fetcher }),
      /Failed to fetch department/
    )
    assert.deepEqual(await loadDepartment('5300', { cache, fetcher }), {
      status: 'found',
      data: { cd_ua: '5300' },
    })
    assert.equal(calls, 2)
  })

  test('corpo sem success/data é resposta inválida', async () => {
    const cache = createDepartmentClientCache()
    await assert.rejects(
      loadDepartment('5300', {
        cache,
        fetcher: async () => jsonResponse(200, { success: false }),
      }),
      /Invalid response format/
    )
    assert.equal(cache.size, 0)
  })

  test('resultado expira em 5 minutos', async () => {
    let now = 0
    const cache = createDepartmentClientCache(() => now)
    let calls = 0
    const fetcher = async () => {
      calls += 1
      return jsonResponse(200, { success: true, data: { cd_ua: '4700' } })
    }
    await loadDepartment('4700', { cache, fetcher })
    now = DEPARTMENT_CLIENT_TTL_MS - 1
    await loadDepartment('4700', { cache, fetcher })
    assert.equal(calls, 1)
    now = DEPARTMENT_CLIENT_TTL_MS
    await loadDepartment('4700', { cache, fetcher })
    assert.equal(calls, 2)
  })

  test('normalizeCdUa aceita só dígitos', () => {
    assert.equal(normalizeCdUa(' 4700 '), '4700')
    assert.equal(normalizeCdUa('47a0'), null)
    assert.equal(normalizeCdUa('../health'), null)
    assert.equal(normalizeCdUa(''), null)
  })
})

describe('getDepartmentCached (BFF)', () => {
  test('consultas simultâneas ao mesmo cd_ua fazem 1 chamada à RMI', async () => {
    const cache = createDepartmentServerCache()
    const pending = deferred<{ status: number; data: unknown }>()
    const calls: string[] = []
    const fetchDepartment = (cdUa: string) => {
      calls.push(cdUa)
      return pending.promise
    }

    const requests = Array.from({ length: 50 }, () =>
      getDepartmentCached('4700', fetchDepartment, cache)
    )
    assert.deepEqual(calls, ['4700'])
    pending.resolve({ status: 200, data: { cd_ua: '4700' } })
    for (const response of await Promise.all(requests)) {
      assert.deepEqual(response, { status: 200, data: { cd_ua: '4700' } })
    }
    await getDepartmentCached('4700', fetchDepartment, cache)
    assert.equal(calls.length, 1)
  })

  test('200 vale 6 h e 404 vale 30 min', async () => {
    let now = 0
    const cache = createDepartmentServerCache(() => now)
    const calls: string[] = []
    const fetchDepartment = async (cdUa: string) => {
      calls.push(cdUa)
      return cdUa === '4700'
        ? { status: 200, data: { cd_ua: cdUa } }
        : { status: 404, data: { error: 'not found' } }
    }
    await getDepartmentCached('4700', fetchDepartment, cache)
    await getDepartmentCached('9999', fetchDepartment, cache)

    now = DEPARTMENT_NOT_FOUND_TTL_MS - 1
    await getDepartmentCached('4700', fetchDepartment, cache)
    await getDepartmentCached('9999', fetchDepartment, cache)
    assert.deepEqual(calls, ['4700', '9999'])

    now = DEPARTMENT_NOT_FOUND_TTL_MS
    await getDepartmentCached('4700', fetchDepartment, cache)
    await getDepartmentCached('9999', fetchDepartment, cache)
    assert.deepEqual(calls, ['4700', '9999', '9999'])

    now = DEPARTMENT_FOUND_TTL_MS
    await getDepartmentCached('4700', fetchDepartment, cache)
    assert.deepEqual(calls, ['4700', '9999', '9999', '4700'])
  })

  test('5xx, 429 e erro de rede não ficam no cache', async () => {
    const cache = createDepartmentServerCache()
    const answers: Array<() => Promise<{ status: number; data: unknown }>> = [
      async () => ({ status: 500, data: null }),
      async () => ({ status: 429, data: null }),
      async () => {
        throw new Error('ECONNRESET')
      },
      async () => ({ status: 200, data: { cd_ua: '4700' } }),
    ]
    let calls = 0
    const fetchDepartment = () => {
      const answer = answers[calls]
      calls += 1
      return answer()
    }

    assert.equal(
      (await getDepartmentCached('4700', fetchDepartment, cache)).status,
      500
    )
    assert.equal(
      (await getDepartmentCached('4700', fetchDepartment, cache)).status,
      429
    )
    await assert.rejects(
      getDepartmentCached('4700', fetchDepartment, cache),
      /ECONNRESET/
    )
    assert.equal(
      (await getDepartmentCached('4700', fetchDepartment, cache)).status,
      200
    )
    assert.equal(calls, 4)
    await getDepartmentCached('4700', fetchDepartment, cache)
    assert.equal(calls, 4)
  })

  test('código não numérico vai direto à RMI, sem cache', async () => {
    const cache = createDepartmentServerCache()
    let calls = 0
    const fetchDepartment = async () => {
      calls += 1
      return { status: 400, data: null }
    }
    await getDepartmentCached('abc', fetchDepartment, cache)
    await getDepartmentCached('abc', fetchDepartment, cache)
    assert.equal(calls, 2)
    assert.equal(cache.size, 0)
  })

  test('não guarda os headers da resposta', async () => {
    const cache = createDepartmentServerCache()
    const response = await getDepartmentCached(
      '4700',
      async () =>
        ({
          status: 200,
          data: { cd_ua: '4700' },
          headers: new Headers({ 'set-cookie': 'x=1' }),
        }) as { status: number; data: unknown },
      cache
    )
    assert.deepEqual(Object.keys(response).sort(), ['data', 'status'])
  })
})
