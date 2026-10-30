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

interface StoredTombamento extends TombamentoStub {
  /** Leituras de página em que o registro ainda não aparece na lista. */
  hiddenReads: number
}

type TestGlobals = typeof globalThis & {
  __dev147Existing?: StoredTombamento[]
  __dev147ListStatus?: number
  __dev147ListCalls?: { page: number; per_page: number }[]
  __dev147PostResponse?: { status: number; data: unknown } | null
  __dev147Writes?: Record<string, unknown>[]
  __dev147Deletes?: string[]
  __dev147DeleteStatus?: number
  __dev147NextId?: number
  __dev147IndexLag?: number
  __dev147OnCreate?: ((created: StoredTombamento) => void) | null
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
      const store = globalThis.__dev147Existing
      const visible = store
        .filter(t => t.hiddenReads <= 0)
        .map(({ hiddenReads, ...rest }) => rest)
      for (const t of store) {
        if (t.hiddenReads > 0) t.hiddenReads -= 1
      }
      const start = (params.page - 1) * params.per_page
      return {
        status: 200,
        data: {
          found: visible.length,
          page: params.page,
          tombamentos: visible.slice(start, start + params.per_page),
        },
      }
    }
    export async function postApiV1AdminTombamentos(body) {
      globalThis.__dev147Writes.push(body)
      const override = globalThis.__dev147PostResponse
      if (override) return override
      const created = {
        id: String(globalThis.__dev147NextId++),
        criado_por: 'qa-sintetico',
        ...body,
      }
      globalThis.__dev147Existing.push({
        ...created,
        hiddenReads: globalThis.__dev147IndexLag,
      })
      globalThis.__dev147OnCreate?.(created)
      return { status: 201, data: created }
    }
    export async function deleteApiV1AdminTombamentosId(id) {
      globalThis.__dev147Deletes.push(id)
      const status = globalThis.__dev147DeleteStatus
      if (status === 204) {
        globalThis.__dev147Existing = globalThis.__dev147Existing.filter(
          t => t.id !== id
        )
      }
      return { status, data: {} }
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

function existing(
  id: string,
  idServicoNovo: string,
  hiddenReads = 0
): StoredTombamento {
  return {
    id,
    origem: '1746_v2_llm',
    id_servico_antigo: `antigo-${id}`,
    id_servico_novo: idServicoNovo,
    criado_por: 'qa-sintetico',
    hiddenReads,
  }
}

function storedIdsFor(idServicoNovo: string): string[] {
  return (testGlobals.__dev147Existing ?? [])
    .filter(tombamento => tombamento.id_servico_novo === idServicoNovo)
    .map(tombamento => tombamento.id)
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
  testGlobals.__dev147Deletes = []
  testGlobals.__dev147DeleteStatus = 204
  testGlobals.__dev147NextId = 1000
  testGlobals.__dev147IndexLag = 0
  testGlobals.__dev147OnCreate = null
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

    const second = await tombar({ id_servico_antigo: 'outro-antigo' })
    assert.equal(second.status, 409)
    assert.equal(typeof second.data.error, 'string')
    assert.deepEqual(second.data.tombamentos_existentes, ['1000'])
    assert.equal(testGlobals.__dev147Writes?.length, 1)
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), ['1000'])
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

// A 6.2 mostrou que a lista da API de busca (Typesense) leva ~1 s para mostrar
// um tombamento novo: dois POSTs seguidos passavam pela checagem. O stub
// reproduz isso escondendo cada registro novo por algumas leituras de página.
describe('POST /api/tombamentos com a lista da API de busca atrasada (DEV-147)', () => {
  test('dois "Tombar" seguidos: o segundo recebe 409 e só um registro fica', async () => {
    testGlobals.__dev147IndexLag = 3

    const first = await tombar({ id_servico_antigo: 'antigo-a' })
    const second = await tombar({ id_servico_antigo: 'antigo-b' })

    assert.equal(first.status, 200)
    assert.equal(second.status, 409)
    assert.deepEqual(second.data.tombamentos_existentes, ['1000'])
    assert.equal(testGlobals.__dev147Writes?.length, 1)
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), ['1000'])
  })

  test('dois "Tombar" simultâneos no mesmo processo: um 200, um 409', async () => {
    testGlobals.__dev147IndexLag = 3

    const results = await Promise.all([
      tombar({ id_servico_antigo: 'antigo-a' }),
      tombar({ id_servico_antigo: 'antigo-b' }),
    ])

    assert.deepEqual(results.map(result => result.status).sort(), [200, 409])
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), ['1000'])
  })

  test('outra réplica gravou antes um tombamento do mesmo serviço: este POST apaga só o seu e responde 409', async () => {
    testGlobals.__dev147IndexLag = 2
    testGlobals.__dev147OnCreate = () => {
      testGlobals.__dev147OnCreate = null
      testGlobals.__dev147Existing?.push(existing('999', SERVICO_NOVO, 1))
    }

    const { status, data } = await tombar()

    assert.equal(status, 409)
    assert.deepEqual(data.tombamentos_existentes, ['999'])
    assert.deepEqual(testGlobals.__dev147Deletes, ['1000'])
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), ['999'])
  })

  test('outra réplica gravou depois: este POST mantém o seu e não apaga o alheio', async () => {
    testGlobals.__dev147IndexLag = 1
    testGlobals.__dev147OnCreate = () => {
      testGlobals.__dev147OnCreate = null
      testGlobals.__dev147Existing?.push(existing('1001', SERVICO_NOVO, 2))
    }

    const { status } = await tombar()

    assert.equal(status, 200)
    assert.deepEqual(testGlobals.__dev147Deletes, [])
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), ['1000', '1001'])
  })

  test('sem conseguir apagar o próprio duplicado: 502 com os ids do serviço', async () => {
    testGlobals.__dev147DeleteStatus = 500
    testGlobals.__dev147OnCreate = () => {
      testGlobals.__dev147OnCreate = null
      testGlobals.__dev147Existing?.push(existing('999', SERVICO_NOVO))
    }

    const { status, data } = await tombar()

    assert.equal(status, 502)
    assert.deepEqual(data.tombamentos_existentes, ['999'])
    assert.deepEqual(testGlobals.__dev147Deletes, ['1000'])
  })

  test('registro que não aparece na lista no prazo: é apagado e a resposta é 503', async () => {
    testGlobals.__dev147IndexLag = 1_000_000

    const { status, data } = await tombar()

    assert.equal(status, 503)
    assert.equal(typeof data.error, 'string')
    assert.deepEqual(testGlobals.__dev147Deletes, ['1000'])
    assert.deepEqual(storedIdsFor(SERVICO_NOVO), [])
  })
})
