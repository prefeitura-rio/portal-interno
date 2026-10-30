import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-147: dois POST /api/tombamentos seguidos para o mesmo serviço novo
// criavam dois tombamentos, e a tabela só mostrava um deles. O handler real é
// chamado com o Heimdall e a API de busca substituídos por stubs.

const SRC_ROOT = new URL('../../../../', import.meta.url)

interface TombamentoStub {
  id: string
  origem: string
  id_servico_antigo: string
  id_servico_novo: string
  criado_por: string
}

type TestGlobals = typeof globalThis & {
  __dev147Existing?: TombamentoStub[]
  __dev147ListStatus?: number
  __dev147ListCalls?: { page: number; per_page: number }[]
  __dev147PostResponse?: { status: number; data: unknown } | null
  __dev147Writes?: Record<string, unknown>[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return ['busca:services:admin']
    }
  `),
  '@/http-busca-search/tombamentos/tombamentos': moduleUrl(`
    export async function getApiV1AdminTombamentos(params) {
      globalThis.__dev147ListCalls.push(params)
      const status = globalThis.__dev147ListStatus
      if (status !== 200) {
        return { status, data: { error: 'falha sintética' } }
      }
      const all = globalThis.__dev147Existing
      const start = (params.page - 1) * params.per_page
      return {
        status: 200,
        data: {
          found: all.length,
          page: params.page,
          tombamentos: all.slice(start, start + params.per_page),
        },
      }
    }
    export async function postApiV1AdminTombamentos(body) {
      globalThis.__dev147Writes.push(body)
      const override = globalThis.__dev147PostResponse
      if (override) return override
      return { status: 201, data: { id: 'tombamento-novo', ...body } }
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

const { POST } = await import('../route.ts')

const SERVICO_NOVO = 'servico-novo-sintetico'

function existing(id: string, idServicoNovo: string): TombamentoStub {
  return {
    id,
    origem: '1746_v2_llm',
    id_servico_antigo: `antigo-${id}`,
    id_servico_novo: idServicoNovo,
    criado_por: 'qa-sintetico',
  }
}

async function tombar(
  body: Record<string, unknown> = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const request = new Request('https://admin.test/api/tombamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origem: '1746_v2_llm',
      id_servico_antigo: 'servico-antigo-sintetico',
      id_servico_novo: SERVICO_NOVO,
      ...body,
    }),
  })
  const response = await POST(request)
  return { status: response.status, data: await response.json() }
}

beforeEach(() => {
  testGlobals.__dev147Existing = []
  testGlobals.__dev147ListStatus = 200
  testGlobals.__dev147ListCalls = []
  testGlobals.__dev147PostResponse = null
  testGlobals.__dev147Writes = []
})

describe('POST /api/tombamentos: um tombamento por serviço novo (DEV-147)', () => {
  test('serviço sem tombamento: cria normalmente', async () => {
    testGlobals.__dev147Existing = [existing('outro', 'outro-servico')]
    const { status, data } = await tombar()
    assert.equal(status, 200)
    assert.equal(data.success, true)
    assert.equal(testGlobals.__dev147Writes?.length, 1)
  })

  test('segundo "Tombar" no mesmo serviço: 409 e nada é gravado', async () => {
    const first = await tombar()
    assert.equal(first.status, 200)
    testGlobals.__dev147Existing = [existing('tombamento-novo', SERVICO_NOVO)]

    const second = await tombar({ id_servico_antigo: 'outro-antigo' })
    assert.equal(second.status, 409)
    assert.equal(typeof second.data.error, 'string')
    assert.deepEqual(second.data.tombamentos_existentes, ['tombamento-novo'])
    assert.equal(testGlobals.__dev147Writes?.length, 1)
  })

  test('tombamento existente fora da primeira página também é encontrado', async () => {
    testGlobals.__dev147Existing = [
      ...Array.from({ length: 150 }, (_, index) =>
        existing(`t-${index}`, `servico-${index}`)
      ),
      existing('duplicado', SERVICO_NOVO),
    ]
    const { status, data } = await tombar()
    assert.equal(status, 409)
    assert.deepEqual(data.tombamentos_existentes, ['duplicado'])
    assert.deepEqual(
      testGlobals.__dev147ListCalls?.map(call => call.page),
      [1, 2]
    )
    assert.deepEqual(testGlobals.__dev147Writes, [])
  })

  test('sem conseguir ler a lista atual: 502 e nada é gravado (falha fechada)', async () => {
    testGlobals.__dev147ListStatus = 500
    const { status } = await tombar()
    assert.equal(status, 502)
    assert.deepEqual(testGlobals.__dev147Writes, [])
  })

  test('409 da API de busca chega à UI como 409 com a mensagem da API', async () => {
    testGlobals.__dev147PostResponse = {
      status: 409,
      data: { error: 'Tombamento já existe para este serviço antigo' },
    }
    const { status, data } = await tombar()
    assert.equal(status, 409)
    assert.equal(data.error, 'Tombamento já existe para este serviço antigo')
  })

  test('ids que não são texto: 400 antes de consultar a API', async () => {
    const { status } = await tombar({ id_servico_novo: { $ne: '' } })
    assert.equal(status, 400)
    assert.deepEqual(testGlobals.__dev147ListCalls, [])
    assert.deepEqual(testGlobals.__dev147Writes, [])
  })
})
