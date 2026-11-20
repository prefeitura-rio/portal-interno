import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-685: quando a Go API recusa as habilidades da vaga (400 com o erro de
// cada campo em `fields`, DEV-524), as rotas do BFF que criam, salvam rascunho
// e editam a vaga repassam `error` e `fields` em vez de uma mensagem genérica,
// para o formulário mostrar o erro no campo. O cliente Orval é um stub (dados
// sintéticos).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type Resposta = { status: number; data: unknown }
type TestGlobals = typeof globalThis & {
  __dev685Resposta?: Resposta
  __dev685Chamadas?: string[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/cache': moduleUrl(`
    export function revalidateTag() {}
  `),
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return ['go:empregabilidade:admin']
    }
  `),
  '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas': moduleUrl(`
    function resposta(fn) {
      globalThis.__dev685Chamadas?.push(fn)
      return globalThis.__dev685Resposta
    }
    export async function getApiV1EmpregabilidadeVagasId(id) {
      return { status: 200, data: { id, status: 'em_edicao' } }
    }
    export async function putApiV1EmpregabilidadeVagasId() {
      return resposta('update')
    }
    export async function postApiV1EmpregabilidadeVagas() {
      return resposta('create')
    }
    export async function putApiV1EmpregabilidadeVagasIdPublish() {
      return resposta('publish')
    }
    export async function putApiV1EmpregabilidadeVagasIdSendToApproval() {
      return resposta('send-to-approval')
    }
    export async function deleteApiV1EmpregabilidadeVagasId() {
      return resposta('delete')
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

const newRoute = await import('../new/route.ts')
const newSendToApprovalRoute = await import('../new/send-to-approval/route.ts')
const draftRoute = await import('../draft/route.ts')
const vagaRoute = await import('../[id]/route.ts')

const VAGA_ID = 'vaga-sintetica-685'
const params = () => Promise.resolve({ id: VAGA_ID })

const ERRO_GO = {
  error: 'Dados inválidos.',
  fields: {
    'areas_atuacao.conhecimento_ids':
      'Cada conhecimento precisa ser da área em que foi marcado: conhecimento 900 não pertence à área de atuação 3.',
  },
}

function corpoDaVaga(): Record<string, unknown> {
  return {
    titulo: 'Vaga sintética',
    descricao: 'Descrição sintética',
    id_contratante: 'empresa-sintetica',
    id_regime_contratacao: 'regime-sintetico',
    id_modelo_trabalho: 'modelo-sintetico',
    bairro: 'Centro',
    id_orgao_parceiro: 'orgao-sintetico',
    requisitos: 'Requisitos sintéticos',
    responsabilidades: 'Responsabilidades sintéticas',
    data_limite: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    areas_atuacao: [{ id_area_atuacao: 3, conhecimento_ids: [900] }],
    comportamento_atitudes_ids: [1],
  }
}

function jsonRequest(method: string, body: unknown): Request {
  return new Request(`http://localhost/api/empregabilidade/vagas/${VAGA_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  testGlobals.__dev685Chamadas = []
  testGlobals.__dev685Resposta = { status: 400, data: ERRO_GO }
})

const ROTAS: [string, () => Promise<Response>][] = [
  [
    'POST /vagas/new (criar e publicar)',
    () => newRoute.POST(jsonRequest('POST', corpoDaVaga())),
  ],
  [
    'POST /vagas/new/send-to-approval (criar e enviar)',
    () => newSendToApprovalRoute.POST(jsonRequest('POST', corpoDaVaga())),
  ],
  [
    'POST /vagas/draft (rascunho)',
    () => draftRoute.POST(jsonRequest('POST', corpoDaVaga())),
  ],
  [
    'PUT /vagas/[id] (editar)',
    () =>
      vagaRoute.PUT(jsonRequest('PUT', corpoDaVaga()), { params: params() }),
  ],
  [
    'PUT /vagas/[id] (salvar rascunho)',
    () =>
      vagaRoute.PUT(
        jsonRequest('PUT', { ...corpoDaVaga(), _saveAsDraft: true }),
        { params: params() }
      ),
  ],
]

for (const [nome, chamar] of ROTAS) {
  describe(nome, () => {
    test('repassa o error e o fields do 400 da Go API', async () => {
      const response = await chamar()
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.equal(body.error, ERRO_GO.error)
      assert.deepEqual(body.fields, ERRO_GO.fields)
      assert.equal(body.success, undefined)
    })

    test('400 sem corpo da Go API mantém a mensagem genérica', async () => {
      testGlobals.__dev685Resposta = { status: 400, data: { detalhe: 1 } }
      const response = await chamar()
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.equal(typeof body.error, 'string')
      assert.ok(body.error.length > 0)
      assert.equal(body.fields, undefined)
    })

    test('outro status não traz fields', async () => {
      testGlobals.__dev685Resposta = { status: 500, data: ERRO_GO }
      const response = await chamar()
      assert.equal(response.status, 500)
      const body = await response.json()
      assert.equal(body.fields, undefined)
    })
  })
}

describe('o fields repassado é só texto', () => {
  test('campos que não são mensagem ficam de fora', async () => {
    testGlobals.__dev685Resposta = {
      status: 400,
      data: {
        error: 'Dados inválidos.',
        fields: { areas_atuacao: 'Área repetida.', interno: { sql: 'x' } },
        stack: 'interno',
      },
    }
    const response = await vagaRoute.PUT(jsonRequest('PUT', corpoDaVaga()), {
      params: params(),
    })
    const body = await response.json()
    assert.deepEqual(body, {
      error: 'Dados inválidos.',
      fields: { areas_atuacao: 'Área repetida.' },
    })
  })
})
