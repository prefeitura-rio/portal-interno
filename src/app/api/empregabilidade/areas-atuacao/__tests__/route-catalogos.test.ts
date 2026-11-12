import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-525: rotas GET do BFF para os catálogos de habilidades da vaga (áreas
// de atuação, conhecimentos de uma área, comportamentos/atitudes). Os
// handlers reais são chamados com o cliente Orval do app-go-api substituído
// por um stub (dados sintéticos).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type ApiCall = { fn: string; id?: number; params?: Record<string, unknown> }
type TestGlobals = typeof globalThis & {
  __dev525Calls?: ApiCall[]
  __dev525Status?: number
  __dev525Throw?: boolean
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const RESPOSTA = `
  function responder(call) {
    globalThis.__dev525Calls?.push(call)
    if (globalThis.__dev525Throw) throw new Error('API fora do ar')
    const status = globalThis.__dev525Status ?? 200
    if (status !== 200) return { status, data: { error: 'erro sintético' } }
    return {
      status: 200,
      data: {
        data: [{ id: 1, nome: 'Item sintético' }],
        page: call.params?.page ?? 1,
        pageSize: call.params?.pageSize ?? 20,
        total: 1,
      },
    }
  }
`

const STUBS: Record<string, string> = {
  '@/http-gorio/empregabilidade-habilidades/empregabilidade-habilidades':
    moduleUrl(`
    ${RESPOSTA}
    export async function getApiV1EmpregabilidadeHabilidadesAreasAtuacao(params) {
      return responder({ fn: 'areas', params })
    }
    export async function getApiV1EmpregabilidadeHabilidadesAreasAtuacaoIdHabilidades(id, params) {
      return responder({ fn: 'conhecimentos', id, params })
    }
  `),
  '@/http-gorio/empregabilidade-comportamentos-atitudes/empregabilidade-comportamentos-atitudes':
    moduleUrl(`
    ${RESPOSTA}
    export async function getApiV1EmpregabilidadeComportamentosAtitudes(params) {
      return responder({ fn: 'comportamentos', params })
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
      for (const suffix of ['.ts', '/index.ts']) {
        const target = new URL(`${specifier}${suffix}`, context.parentURL)
        if (existsSync(fileURLToPath(target))) {
          return nextResolve(target.href, context)
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { NextRequest } = await import('next/server')
const areasRoute = await import('../route.ts')
const conhecimentosRoute = await import('../[id]/conhecimentos/route.ts')
const comportamentosRoute = await import(
  '../../comportamentos-atitudes/route.ts'
)

function get(path: string) {
  return new NextRequest(`http://localhost${path}`)
}

const conhecimentosParams = (id: string) => ({
  params: Promise.resolve({ id }),
})

function calls(): ApiCall[] {
  return testGlobals.__dev525Calls ?? []
}

const originalError = console.error

beforeEach(() => {
  testGlobals.__dev525Calls = []
  testGlobals.__dev525Status = undefined
  testGlobals.__dev525Throw = false
  console.error = originalError
})

describe('GET /api/empregabilidade/areas-atuacao', () => {
  test('repassa q, page e pageSize e devolve data e meta', async () => {
    const response = await areasRoute.GET(
      get('/api/empregabilidade/areas-atuacao?q=%20tec%20&page=2&pageSize=50')
    )
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      data: [{ id: 1, nome: 'Item sintético' }],
      meta: { page: 2, page_size: 50, total: 1 },
      success: true,
    })
    assert.deepEqual(calls(), [
      { fn: 'areas', params: { q: 'tec', page: 2, pageSize: 50 } },
    ])
  })

  test('sem parâmetros pede a página 1 com 20 itens', async () => {
    const response = await areasRoute.GET(
      get('/api/empregabilidade/areas-atuacao')
    )
    assert.equal(response.status, 200)
    assert.deepEqual(calls(), [
      { fn: 'areas', params: { page: 1, pageSize: 20 } },
    ])
  })

  test('parâmetro inválido: 400 sem chamar a API', async () => {
    for (const query of ['page=0', 'pageSize=101', 'page=abc']) {
      const response = await areasRoute.GET(
        get(`/api/empregabilidade/areas-atuacao?${query}`)
      )
      assert.equal(response.status, 400, query)
      const body = (await response.json()) as { error?: unknown }
      assert.equal(typeof body.error, 'string')
    }
    assert.deepEqual(calls(), [])
  })

  test('erro da API repassa o status; exceção vira 500 sem detalhe', async () => {
    testGlobals.__dev525Status = 503
    const erro = await areasRoute.GET(get('/api/empregabilidade/areas-atuacao'))
    assert.equal(erro.status, 503)

    testGlobals.__dev525Status = undefined
    testGlobals.__dev525Throw = true
    console.error = () => {}
    const falha = await areasRoute.GET(
      get('/api/empregabilidade/areas-atuacao')
    )
    assert.equal(falha.status, 500)
    assert.deepEqual(await falha.json(), { error: 'Erro interno do servidor' })
  })
})

describe('GET /api/empregabilidade/areas-atuacao/[id]/conhecimentos', () => {
  test('busca os conhecimentos da área pedida', async () => {
    const response = await conhecimentosRoute.GET(
      get('/api/empregabilidade/areas-atuacao/3/conhecimentos?q=java&page=1'),
      conhecimentosParams('3')
    )
    assert.equal(response.status, 200)
    assert.deepEqual(calls(), [
      {
        fn: 'conhecimentos',
        id: 3,
        params: { q: 'java', page: 1, pageSize: 20 },
      },
    ])
  })

  test('id inválido: 400 sem chamar a API', async () => {
    for (const id of ['0', '-1', 'abc', '3.5', '1;drop']) {
      const response = await conhecimentosRoute.GET(
        get(`/api/empregabilidade/areas-atuacao/${id}/conhecimentos`),
        conhecimentosParams(id)
      )
      assert.equal(response.status, 400, id)
    }
    assert.deepEqual(calls(), [])
  })

  test('parâmetro de busca inválido: 400 sem chamar a API', async () => {
    const response = await conhecimentosRoute.GET(
      get('/api/empregabilidade/areas-atuacao/3/conhecimentos?pageSize=500'),
      conhecimentosParams('3')
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })

  test('área inexistente: 404', async () => {
    testGlobals.__dev525Status = 404
    const response = await conhecimentosRoute.GET(
      get('/api/empregabilidade/areas-atuacao/999/conhecimentos'),
      conhecimentosParams('999')
    )
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), {
      error: 'Área de atuação não encontrada',
    })
  })
})

describe('GET /api/empregabilidade/comportamentos-atitudes', () => {
  test('repassa q, page e pageSize e devolve data e meta', async () => {
    const response = await comportamentosRoute.GET(
      get('/api/empregabilidade/comportamentos-atitudes?q=pro&pageSize=100')
    )
    assert.equal(response.status, 200)
    const body = (await response.json()) as { meta: unknown }
    assert.deepEqual(body.meta, { page: 1, page_size: 100, total: 1 })
    assert.deepEqual(calls(), [
      { fn: 'comportamentos', params: { q: 'pro', page: 1, pageSize: 100 } },
    ])
  })

  test('parâmetro inválido: 400 sem chamar a API', async () => {
    const response = await comportamentosRoute.GET(
      get('/api/empregabilidade/comportamentos-atitudes?page=-2')
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })
})
