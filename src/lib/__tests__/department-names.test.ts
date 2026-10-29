import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-100 (devolvido pela 6.2): a tabela "Tração por secretaria" pedia o nome
// de cada secretaria do navegador, todas ao mesmo tempo, e a RMI respondia
// 429 a quase todas ("Órgão não encontrado" em 49 de 50 linhas). Os nomes
// passam a ser resolvidos no BFF, em lote controlado, com novas tentativas e
// cache.

const {
  DEPARTMENT_FOUND_TTL_MS,
  DEPARTMENT_NAME_CONCURRENCY,
  DEPARTMENT_NAME_MAX_ATTEMPTS,
  DEPARTMENT_NAME_MAX_DELAY_MS,
  DEPARTMENT_NOT_FOUND_TTL_MS,
  DepartmentNameCache,
  isValidCdUa,
  parseDepartment,
  parseRetryAfterMs,
  resolveDepartmentNames,
} = await import('../department-names.ts')

type Result = { status: number; data: unknown; headers?: Headers | null }

function department(cdUa: string): Result {
  return {
    status: 200,
    data: { cd_ua: cdUa, nome_ua: `Secretaria ${cdUa}`, sigla_ua: `S${cdUa}` },
  }
}

function tooManyRequests(retryAfter?: string): Result {
  return {
    status: 429,
    data: { error: 'rate limit' },
    headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}),
  }
}

/** Relógio falso: `sleep` avança o tempo sem esperar de verdade. */
function fakeClock(start = 1_000_000) {
  const clock = {
    now: start,
    sleeps: [] as number[],
    read: () => clock.now,
    sleep: async (ms: number) => {
      clock.sleeps.push(ms)
      clock.now += ms
      await Promise.resolve()
    },
  }
  return clock
}

const codes = (n: number) =>
  Array.from({ length: n }, (_, i) => String(1000 + i))

describe('rajada de secretarias contra o limite de taxa da RMI', () => {
  test('51 secretarias: no máximo 2 consultas por vez e todos os nomes resolvidos', async () => {
    const clock = fakeClock()
    // RMI falsa: 5 consultas por janela de 1 s; acima disso, 429
    const windowMs = 1000
    const perWindow = 5
    const served = new Map<number, number>()
    let inFlight = 0
    let maxInFlight = 0
    let rejected = 0

    const fetchDepartment = async (cdUa: string): Promise<Result> => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight -= 1
      const window = Math.floor(clock.now / windowMs)
      const count = served.get(window) ?? 0
      if (count >= perWindow) {
        rejected += 1
        return tooManyRequests('1')
      }
      served.set(window, count + 1)
      return department(cdUa)
    }

    const names = await resolveDepartmentNames(codes(51), fetchDepartment, {
      cache: new DepartmentNameCache(clock.read),
      now: clock.read,
      sleep: clock.sleep,
      deadlineMs: 120_000,
    })

    assert.equal(DEPARTMENT_NAME_CONCURRENCY, 2)
    assert.ok(maxInFlight <= DEPARTMENT_NAME_CONCURRENCY, `${maxInFlight}`)
    assert.ok(rejected > 0, 'a RMI falsa precisa ter limitado a taxa')
    assert.equal(names.size, 51)
    for (const cdUa of codes(51)) {
      assert.deepEqual(names.get(cdUa), {
        status: 'found',
        nome: `Secretaria ${cdUa}`,
        sigla: `S${cdUa}`,
      })
    }
    // Esperou o Retry-After (1 s) da RMI
    assert.ok(clock.sleeps.every(ms => ms === 1000))
  })

  test('segunda carga sai do cache, sem consultar a RMI', async () => {
    const clock = fakeClock()
    const cache = new DepartmentNameCache(clock.read)
    let calls = 0
    const fetchDepartment = async (cdUa: string) => {
      calls += 1
      return department(cdUa)
    }
    await resolveDepartmentNames(codes(10), fetchDepartment, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.equal(calls, 10)
    const again = await resolveDepartmentNames(codes(10), fetchDepartment, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.equal(calls, 10)
    assert.equal(again.get('1003')?.status, 'found')
  })
})

describe('resolveDepartmentNames: novas tentativas', () => {
  test('429 com Retry-After espera o tempo pedido e tenta de novo', async () => {
    const clock = fakeClock()
    const answers = [tooManyRequests('2'), department('1000')]
    const names = await resolveDepartmentNames(
      ['1000'],
      async () => answers.shift() ?? department('1000'),
      {
        cache: new DepartmentNameCache(clock.read),
        now: clock.read,
        sleep: clock.sleep,
      }
    )
    assert.deepEqual(clock.sleeps, [2000])
    assert.equal(names.get('1000')?.status, 'found')
  })

  test('Retry-After muito longo é limitado', async () => {
    const clock = fakeClock()
    const answers = [tooManyRequests('120'), department('1000')]
    await resolveDepartmentNames(
      ['1000'],
      async () => answers.shift() ?? department('1000'),
      {
        cache: new DepartmentNameCache(clock.read),
        now: clock.read,
        sleep: clock.sleep,
      }
    )
    assert.deepEqual(clock.sleeps, [DEPARTMENT_NAME_MAX_DELAY_MS])
  })

  test('sem Retry-After, recuo exponencial até esgotar as tentativas; falha não fica em cache', async () => {
    const clock = fakeClock()
    const cache = new DepartmentNameCache(clock.read)
    let calls = 0
    const alwaysBusy = async () => {
      calls += 1
      return { status: 503, data: 'unavailable' }
    }
    const names = await resolveDepartmentNames(['1000'], alwaysBusy, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.equal(calls, DEPARTMENT_NAME_MAX_ATTEMPTS)
    assert.deepEqual(clock.sleeps, [500, 1000, 2000])
    assert.deepEqual(names.get('1000'), { status: 'unavailable' })
    assert.equal(cache.get('1000'), null)

    // A próxima carga tenta de novo
    await resolveDepartmentNames(['1000'], alwaysBusy, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.equal(calls, DEPARTMENT_NAME_MAX_ATTEMPTS * 2)
  })

  test('erro de rede também tenta de novo', async () => {
    const clock = fakeClock()
    let calls = 0
    const names = await resolveDepartmentNames(
      ['1000'],
      async cdUa => {
        calls += 1
        if (calls === 1) throw new Error('ECONNRESET')
        return department(cdUa)
      },
      {
        cache: new DepartmentNameCache(clock.read),
        now: clock.read,
        sleep: clock.sleep,
      }
    )
    assert.equal(calls, 2)
    assert.equal(names.get('1000')?.status, 'found')
  })

  test('401 e 403 não tentam de novo', async () => {
    for (const status of [401, 403]) {
      const clock = fakeClock()
      let calls = 0
      const names = await resolveDepartmentNames(
        ['1000'],
        async () => {
          calls += 1
          return { status, data: {} }
        },
        {
          cache: new DepartmentNameCache(clock.read),
          now: clock.read,
          sleep: clock.sleep,
        }
      )
      assert.equal(calls, 1, `${status}`)
      assert.deepEqual(names.get('1000'), { status: 'unavailable' })
    }
  })

  test('prazo da carga esgotado: o restante fica indisponível sem consultar', async () => {
    const clock = fakeClock()
    let calls = 0
    const names = await resolveDepartmentNames(
      codes(4),
      async () => {
        calls += 1
        return tooManyRequests('5')
      },
      {
        cache: new DepartmentNameCache(clock.read),
        now: clock.read,
        sleep: clock.sleep,
        concurrency: 1,
        deadlineMs: 6_000,
      }
    )
    // 1ª consulta, espera de 5 s, 2ª consulta; a próxima espera passaria do
    // prazo, e os outros códigos já não consultam
    assert.equal(calls, 2)
    for (const cdUa of codes(4)) {
      assert.deepEqual(names.get(cdUa), { status: 'unavailable' })
    }
  })
})

describe('resolveDepartmentNames: respostas definitivas e entrada hostil', () => {
  test('404 é "não encontrado" e fica em cache por menos tempo que o nome', async () => {
    const clock = fakeClock()
    const cache = new DepartmentNameCache(clock.read)
    let calls = 0
    const notFound = async () => {
      calls += 1
      return { status: 404, data: { error: 'not found' } }
    }
    const names = await resolveDepartmentNames(['1000'], notFound, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.deepEqual(names.get('1000'), { status: 'not_found' })
    assert.deepEqual(clock.sleeps, [])
    assert.deepEqual(cache.get('1000'), { status: 'not_found' })
    assert.ok(DEPARTMENT_NOT_FOUND_TTL_MS < DEPARTMENT_FOUND_TTL_MS)

    clock.now += DEPARTMENT_NOT_FOUND_TTL_MS
    assert.equal(cache.get('1000'), null)
    await resolveDepartmentNames(['1000'], notFound, {
      cache,
      now: clock.read,
      sleep: clock.sleep,
    })
    assert.equal(calls, 2)
  })

  test('nome encontrado expira depois do TTL', () => {
    const clock = fakeClock()
    const cache = new DepartmentNameCache(clock.read)
    cache.set('1000', { status: 'found', nome: 'X', sigla: null })
    clock.now += DEPARTMENT_FOUND_TTL_MS - 1
    assert.equal(cache.get('1000')?.status, 'found')
    clock.now += 1
    assert.equal(cache.get('1000'), null)
  })

  test('código que não é cd_ua numérico não vira consulta', async () => {
    const hostile = [
      '../admin',
      '1000/../../x',
      '1000?a=1',
      ' 1000',
      'SMTE',
      '',
    ]
    let calls = 0
    const names = await resolveDepartmentNames(
      hostile,
      async () => {
        calls += 1
        return department('x')
      },
      { cache: new DepartmentNameCache() }
    )
    assert.equal(calls, 0)
    for (const value of hostile) {
      assert.deepEqual(names.get(value), { status: 'not_found' })
      assert.equal(isValidCdUa(value), false)
    }
    assert.equal(isValidCdUa('2802'), true)
  })

  test('código repetido é consultado uma vez', async () => {
    const asked: string[] = []
    await resolveDepartmentNames(
      ['1000', '1000', '2000', '1000'],
      async cdUa => {
        asked.push(cdUa)
        return department(cdUa)
      },
      { cache: new DepartmentNameCache() }
    )
    assert.deepEqual(asked.sort(), ['1000', '2000'])
  })

  test('200 com corpo inválido fica indisponível', async () => {
    const names = await resolveDepartmentNames(
      ['1000'],
      async () => ({ status: 200, data: 'html de erro' }),
      { cache: new DepartmentNameCache() }
    )
    assert.deepEqual(names.get('1000'), { status: 'unavailable' })
  })

  test('cache descarta o código mais antigo acima do limite', () => {
    const cache = new DepartmentNameCache(Date.now, 2)
    cache.set('1', { status: 'not_found' })
    cache.set('2', { status: 'not_found' })
    cache.set('3', { status: 'not_found' })
    assert.equal(cache.size, 2)
    assert.equal(cache.get('1'), null)
    assert.deepEqual(cache.get('3'), { status: 'not_found' })
  })
})

describe('parseDepartment e parseRetryAfterMs', () => {
  test('lê nome e sigla, com ou sem embrulho em data', () => {
    assert.deepEqual(
      parseDepartment({ nome_ua: ' Secretaria X ', sigla_ua: 'SX' }, '1'),
      { nome: 'Secretaria X', sigla: 'SX' }
    )
    assert.deepEqual(
      parseDepartment({ data: { nome_ua: 'Secretaria Y' } }, '2'),
      { nome: 'Secretaria Y', sigla: null }
    )
  })

  test('sem nome, mostra o código; corpo que não é objeto é inválido', () => {
    assert.deepEqual(parseDepartment({ nome_ua: '  ' }, '1000'), {
      nome: '1000',
      sigla: null,
    })
    assert.equal(parseDepartment('texto', '1000'), null)
    assert.equal(parseDepartment(null, '1000'), null)
    assert.equal(parseDepartment([1], '1000'), null)
  })

  test('Retry-After em segundos ou data HTTP', () => {
    const now = Date.parse('2026-10-29T12:00:00Z')
    assert.equal(
      parseRetryAfterMs(new Headers({ 'retry-after': '3' }), now),
      3000
    )
    assert.equal(
      parseRetryAfterMs(
        new Headers({ 'retry-after': 'Thu, 29 Oct 2026 12:00:04 GMT' }),
        now
      ),
      4000
    )
    assert.equal(
      parseRetryAfterMs(new Headers({ 'retry-after': 'logo' }), now),
      null
    )
    assert.equal(parseRetryAfterMs(new Headers(), now), null)
    assert.equal(parseRetryAfterMs(undefined, now), null)
  })
})
