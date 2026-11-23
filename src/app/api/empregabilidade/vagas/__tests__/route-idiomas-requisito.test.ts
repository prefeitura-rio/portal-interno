import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'

// DEV-744: quando a Go API recusava o PUT dos idiomas da vaga, a rota do BFF
// devolvia sempre "Erro ao atualizar requisitos de idioma", descartando o
// motivo real. Agora o 4xx repassa `error` e `fields` saneados, como as outras
// rotas da vaga (DEV-685). O cliente da Go API e a guarda de curadoria são
// stubs (dados sintéticos).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type Resposta = { status: number; data: unknown }
type Chamada = { url: string; method?: string; body?: unknown }
type TestGlobals = typeof globalThis & {
  __dev744Resposta?: Resposta
  __dev744Chamadas?: Chamada[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUB_CUSTOM_FETCH = moduleUrl(`
  export async function customFetchGoRio(url, init) {
    globalThis.__dev744Chamadas?.push({
      url,
      method: init?.method,
      body: init?.body ? JSON.parse(init.body) : undefined,
    })
    return globalThis.__dev744Resposta
  }
`)

const STUBS: Record<string, string> = {
  '@/lib/empregabilidade-curation-guard': moduleUrl(`
    export async function denyVagaChangeForCuration() {
      return null
    }
  `),
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier]
    if (stub) {
      return { url: stub, shortCircuit: true }
    }
    if (specifier.endsWith('/custom-fetch-gorio')) {
      return { url: STUB_CUSTOM_FETCH, shortCircuit: true }
    }
    if (specifier === 'next/server') {
      return nextResolve('next/server.js', context)
    }
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const idiomasRoute = await import('../[id]/idiomas-requisito/route.ts')

const VAGA_ID = 'vaga-sintetica-744'
const ERRO_PADRAO = 'Erro ao atualizar requisitos de idioma'
const CORPO = {
  requisitos: [
    {
      id_vaga: VAGA_ID,
      id_idioma: 'idioma-sintetico',
      id_nivel_minimo: 'nivel-sintetico',
    },
  ],
}

function chamar(): Promise<Response> {
  return idiomasRoute.PUT(
    new Request(
      `http://localhost/api/empregabilidade/vagas/${VAGA_ID}/idiomas-requisito`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CORPO),
      }
    ),
    { params: Promise.resolve({ id: VAGA_ID }) }
  )
}

beforeEach(() => {
  testGlobals.__dev744Chamadas = []
  testGlobals.__dev744Resposta = { status: 200, data: { ok: true } }
})

describe('PUT /vagas/[id]/idiomas-requisito', () => {
  test('200 encaminha o corpo à Go API e responde sucesso', async () => {
    const response = await chamar()
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      success: true,
      data: { ok: true },
    })
    assert.deepEqual(testGlobals.__dev744Chamadas, [
      {
        url: `/api/v1/empregabilidade/vagas/${VAGA_ID}/idiomas-requisito`,
        method: 'PUT',
        body: CORPO,
      },
    ])
  })

  test('400 da Go API repassa o error e o fields reais', async () => {
    testGlobals.__dev744Resposta = {
      status: 400,
      data: {
        error: 'Nível mínimo inválido para o idioma.',
        fields: { id_nivel_minimo: 'Nível não encontrado.' },
      },
    }
    const response = await chamar()
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), {
      error: 'Nível mínimo inválido para o idioma.',
      fields: { id_nivel_minimo: 'Nível não encontrado.' },
    })
  })

  test('403 da Go API repassa a mensagem dela', async () => {
    testGlobals.__dev744Resposta = {
      status: 403,
      data: { error: 'Sem permissão para alterar esta vaga.' },
    }
    const response = await chamar()
    assert.equal(response.status, 403)
    const body = await response.json()
    assert.equal(body.error, 'Sem permissão para alterar esta vaga.')
  })

  test('4xx sem mensagem da Go API mantém o texto padrão', async () => {
    testGlobals.__dev744Resposta = { status: 400, data: { detalhe: 1 } }
    const response = await chamar()
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: ERRO_PADRAO })
  })

  test('só texto é repassado: o resto do corpo da Go API fica de fora', async () => {
    testGlobals.__dev744Resposta = {
      status: 400,
      data: {
        error: 'Dados inválidos.',
        fields: { requisitos: 'Idioma repetido.', interno: { sql: 'x' } },
        stack: 'interno',
      },
    }
    const response = await chamar()
    assert.deepEqual(await response.json(), {
      error: 'Dados inválidos.',
      fields: { requisitos: 'Idioma repetido.' },
    })
  })

  test('5xx não expõe detalhe interno', async () => {
    testGlobals.__dev744Resposta = {
      status: 500,
      data: { error: 'pq: duplicate key value violates unique constraint' },
    }
    const response = await chamar()
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { error: ERRO_PADRAO })
  })
})
