import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-818: o BFF /api/departments/[cd_ua] repassava cada chamada à RMI. O
// handler real é chamado com o cliente da RMI substituído por um stub que
// conta as chamadas e responde quando o teste mandar.

const SRC_ROOT = new URL('../../../../', import.meta.url)

interface RmiCall {
  cdUa: string
  resolve: (value: { status: number; data: unknown }) => void
  reject: (reason: unknown) => void
}

type TestGlobals = typeof globalThis & { __dev818RmiCalls?: RmiCall[] }
const testGlobals = globalThis as TestGlobals
testGlobals.__dev818RmiCalls = []

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  '@/http-rmi/departments/departments': moduleUrl(`
    export function getDepartmentsCdUa(cdUa) {
      return new Promise((resolve, reject) => {
        globalThis.__dev818RmiCalls.push({ cdUa, resolve, reject })
      })
    }
  `),
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier]
    if (stub) {
      return { url: stub, shortCircuit: true }
    }
    if (specifier === 'next/server') {
      return nextResolve('next/server.js', context)
    }
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

const { GET } = await import('../[cd_ua]/route.ts')
const { departmentServerCache } = await import(
  '../../../../lib/department-server-cache.ts'
)

function rmiCalls(): RmiCall[] {
  return testGlobals.__dev818RmiCalls ?? []
}

function callRoute(cdUa: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/departments/${cdUa}`), {
    params: Promise.resolve({ cd_ua: cdUa }),
  })
}

async function waitForRmiCalls(count: number): Promise<void> {
  for (let i = 0; i < 50 && rmiCalls().length < count; i++) {
    await new Promise(resolve => setImmediate(resolve))
  }
}

beforeEach(() => {
  testGlobals.__dev818RmiCalls = []
  departmentServerCache.clear()
})

describe('GET /api/departments/[cd_ua]', () => {
  test('requisições simultâneas ao mesmo cd_ua fazem 1 chamada à RMI', async () => {
    const responses = Array.from({ length: 20 }, () => callRoute('4700'))
    await waitForRmiCalls(1)
    // Dá tempo de as outras 19 chegarem ao cache antes de a RMI responder
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setImmediate(resolve))
    }
    assert.equal(rmiCalls().length, 1)
    assert.equal(rmiCalls()[0].cdUa, '4700')

    rmiCalls()[0].resolve({
      status: 200,
      data: { cd_ua: '4700', nome_ua: 'Secretaria Sintética' },
    })
    for (const response of await Promise.all(responses)) {
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), {
        data: { cd_ua: '4700', nome_ua: 'Secretaria Sintética' },
        success: true,
      })
    }

    const again = await callRoute('4700')
    assert.equal(again.status, 200)
    assert.equal(rmiCalls().length, 1)
  })

  test('404 responde 404 e fica no cache', async () => {
    const first = callRoute('9999')
    await waitForRmiCalls(1)
    rmiCalls()[0].resolve({ status: 404, data: { error: 'not found' } })
    assert.equal((await first).status, 404)

    const second = await callRoute('9999')
    assert.equal(second.status, 404)
    assert.deepEqual(await second.json(), { error: 'Department not found' })
    assert.equal(rmiCalls().length, 1)
  })

  test('5xx da RMI não fica no cache', async () => {
    const first = callRoute('5300')
    await waitForRmiCalls(1)
    rmiCalls()[0].resolve({ status: 503, data: null })
    const failed = await first
    assert.equal(failed.status, 503)
    assert.deepEqual(await failed.json(), {
      error: 'Failed to fetch department',
    })

    const second = callRoute('5300')
    await waitForRmiCalls(2)
    assert.equal(rmiCalls().length, 2)
    rmiCalls()[1].resolve({ status: 200, data: { cd_ua: '5300' } })
    assert.equal((await second).status, 200)
  })

  test('erro de rede responde 500 a todas as requisições em voo e não fica no cache', async () => {
    const originalError = console.error
    console.error = () => {}
    try {
      const responses = [callRoute('5300'), callRoute('5300')]
      await waitForRmiCalls(1)
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setImmediate(resolve))
      }
      assert.equal(rmiCalls().length, 1)
      rmiCalls()[0].reject(new Error('ECONNRESET'))
      for (const response of await Promise.all(responses)) {
        assert.equal(response.status, 500)
        assert.deepEqual(await response.json(), {
          error: 'Internal server error',
        })
      }
    } finally {
      console.error = originalError
    }

    const retry = callRoute('5300')
    await waitForRmiCalls(2)
    assert.equal(rmiCalls().length, 2)
    rmiCalls()[1].resolve({ status: 200, data: { cd_ua: '5300' } })
    assert.equal((await retry).status, 200)
  })

  test('cd_ua diferentes consultam cada um', async () => {
    const responses = [callRoute('4700'), callRoute('5300'), callRoute('4700')]
    await waitForRmiCalls(2)
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setImmediate(resolve))
    }
    assert.deepEqual(
      rmiCalls()
        .map(call => call.cdUa)
        .sort(),
      ['4700', '5300']
    )
    for (const call of rmiCalls()) {
      call.resolve({ status: 200, data: { cd_ua: call.cdUa } })
    }
    for (const response of await Promise.all(responses)) {
      assert.equal(response.status, 200)
    }
  })
})
