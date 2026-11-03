import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-167: as rotas do BFF que publicam uma vaga só conferiam se `data_limite`
// estava presente (e `POST /vagas/new` nem isso). Uma chamada direta publicava
// a vaga com data limite no passado. Aqui os handlers reais são chamados com o
// cliente Orval da API de empregabilidade substituído por um stub (vagas
// sintéticas).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type ApiCall = { fn: string; id?: string; body?: Record<string, unknown> }
type TestGlobals = typeof globalThis & {
  __dev167Vaga?: Record<string, unknown>
  __dev167Calls?: ApiCall[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/cache': moduleUrl(`
    export function revalidateTag() {}
  `),
  '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas': moduleUrl(`
    function record(call) {
      globalThis.__dev167Calls?.push(call)
    }
    export async function getApiV1EmpregabilidadeVagasId(id) {
      return { status: 200, data: { id, ...globalThis.__dev167Vaga } }
    }
    export async function putApiV1EmpregabilidadeVagasId(id, body) {
      record({ fn: 'update', id, body })
      return { status: 200, data: { ...body, id } }
    }
    export async function postApiV1EmpregabilidadeVagas(body) {
      record({ fn: 'create', body })
      return { status: 201, data: { ...body, id: 'vaga-sintetica-nova' } }
    }
    export async function putApiV1EmpregabilidadeVagasIdPublish(id) {
      record({ fn: 'publish', id })
      return { status: 200, data: { id, status: 'publicado_ativo' } }
    }
    export async function deleteApiV1EmpregabilidadeVagasId(id) {
      record({ fn: 'delete', id })
      return { status: 200, data: {} }
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
const vagaRoute = await import('../[id]/route.ts')
const publishRoute = await import('../[id]/publish/route.ts')
const {
  DATA_LIMITE_INVALID_MESSAGE,
  DATA_LIMITE_NOT_IN_FUTURE_MESSAGE,
  DATA_LIMITE_REQUIRED_MESSAGE,
  validateVagaDataLimite,
} = await import('../../../../../lib/empregabilidade-vaga-dates.ts')

const VAGA_ID = 'vaga-sintetica-1'
const params = () => Promise.resolve({ id: VAGA_ID })

const HOUR_MS = 60 * 60 * 1000
const pastIso = () => new Date(Date.now() - HOUR_MS).toISOString()
const futureIso = () => new Date(Date.now() + 24 * HOUR_MS).toISOString()

/** Os 5 campos que toda vaga exige e os 5 extras da publicação. */
function publishableFields(dataLimite?: unknown): Record<string, unknown> {
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
    ...(dataLimite === undefined ? {} : { data_limite: dataLimite }),
  }
}

function jsonRequest(method: string, body: unknown): Request {
  return new Request(`http://localhost/api/empregabilidade/vagas/${VAGA_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function calls(): ApiCall[] {
  return testGlobals.__dev167Calls ?? []
}

beforeEach(() => {
  testGlobals.__dev167Calls = []
  testGlobals.__dev167Vaga = {}
})

describe('validateVagaDataLimite (DEV-167)', () => {
  test('aceita data e hora futuras', () => {
    assert.equal(validateVagaDataLimite(futureIso()), null)
  })

  test('recusa data e hora passadas, inclusive no dia de hoje', () => {
    assert.equal(
      validateVagaDataLimite(pastIso()),
      DATA_LIMITE_NOT_IN_FUTURE_MESSAGE
    )
    assert.equal(
      validateVagaDataLimite(new Date(Date.now() - 1000).toISOString()),
      DATA_LIMITE_NOT_IN_FUTURE_MESSAGE
    )
  })

  test('recusa data ausente ou vazia', () => {
    assert.equal(
      validateVagaDataLimite(undefined),
      DATA_LIMITE_REQUIRED_MESSAGE
    )
    assert.equal(validateVagaDataLimite(null), DATA_LIMITE_REQUIRED_MESSAGE)
    assert.equal(validateVagaDataLimite('   '), DATA_LIMITE_REQUIRED_MESSAGE)
  })

  test('recusa valor que não é data', () => {
    assert.equal(
      validateVagaDataLimite('não é data'),
      DATA_LIMITE_INVALID_MESSAGE
    )
    assert.equal(
      validateVagaDataLimite(Date.now() + HOUR_MS),
      DATA_LIMITE_INVALID_MESSAGE
    )
    assert.equal(validateVagaDataLimite({}), DATA_LIMITE_INVALID_MESSAGE)
  })
})

describe('POST /api/empregabilidade/vagas/new (DEV-167)', () => {
  test('recusa com 400 data limite no passado, sem criar a vaga', async () => {
    const response = await newRoute.POST(
      jsonRequest('POST', publishableFields(pastIso()))
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_NOT_IN_FUTURE_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('recusa com 400 data limite ausente, sem criar a vaga', async () => {
    const response = await newRoute.POST(
      jsonRequest('POST', publishableFields())
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_REQUIRED_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('recusa com 400 data limite inválida, sem criar a vaga', async () => {
    const response = await newRoute.POST(
      jsonRequest('POST', publishableFields('31/12/2099'))
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_INVALID_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('cria e publica com data limite futura', async () => {
    const response = await newRoute.POST(
      jsonRequest('POST', publishableFields(futureIso()))
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => call.fn),
      ['create', 'publish']
    )
  })
})

describe('PUT /api/empregabilidade/vagas/[id] (DEV-167)', () => {
  for (const status of [
    'publicado_ativo',
    'publicado_expirado',
    'vaga_congelada',
  ]) {
    test(`vaga ${status}: recusa com 400 data limite no passado`, async () => {
      testGlobals.__dev167Vaga = { status }
      const response = await vagaRoute.PUT(
        jsonRequest('PUT', publishableFields(pastIso())),
        { params: params() }
      )
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.equal(body.error, DATA_LIMITE_NOT_IN_FUTURE_MESSAGE)
      assert.deepEqual(calls(), [])
    })
  }

  test('rascunho salvo para publicar: recusa data limite no passado', async () => {
    testGlobals.__dev167Vaga = { status: 'em_edicao' }
    const response = await vagaRoute.PUT(
      jsonRequest('PUT', publishableFields(pastIso())),
      { params: params() }
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })

  test('recusa data limite inválida', async () => {
    testGlobals.__dev167Vaga = { status: 'publicado_ativo' }
    const response = await vagaRoute.PUT(
      jsonRequest('PUT', publishableFields('amanhã')),
      { params: params() }
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_INVALID_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('data limite ausente segue recusada como campo faltando', async () => {
    testGlobals.__dev167Vaga = { status: 'publicado_ativo' }
    const response = await vagaRoute.PUT(
      jsonRequest('PUT', publishableFields()),
      { params: params() }
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.deepEqual(body.missingFields, ['Data Limite'])
    assert.deepEqual(calls(), [])
  })

  test('rascunho (_saveAsDraft) continua aceitando data limite passada', async () => {
    testGlobals.__dev167Vaga = { status: 'em_edicao' }
    const response = await vagaRoute.PUT(
      jsonRequest('PUT', {
        ...publishableFields(pastIso()),
        _saveAsDraft: true,
      }),
      { params: params() }
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => call.fn),
      ['update']
    )
  })

  test('vaga publicada: salva com data limite futura', async () => {
    testGlobals.__dev167Vaga = { status: 'publicado_expirado' }
    const response = await vagaRoute.PUT(
      jsonRequest('PUT', publishableFields(futureIso())),
      { params: params() }
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => call.fn),
      ['update']
    )
  })
})

describe('PUT /api/empregabilidade/vagas/[id]/publish (DEV-167)', () => {
  test('recusa com 400 vaga com data limite no passado, sem publicar', async () => {
    testGlobals.__dev167Vaga = {
      status: 'em_edicao',
      ...publishableFields(pastIso()),
    }
    const response = await publishRoute.PUT(jsonRequest('PUT', {}), {
      params: params(),
    })
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_NOT_IN_FUTURE_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('recusa com 400 vaga com data limite inválida, sem publicar', async () => {
    testGlobals.__dev167Vaga = {
      status: 'em_aprovacao',
      ...publishableFields('data-invalida'),
    }
    const response = await publishRoute.PUT(jsonRequest('PUT', {}), {
      params: params(),
    })
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, DATA_LIMITE_INVALID_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('publica vaga com data limite futura', async () => {
    testGlobals.__dev167Vaga = {
      status: 'em_edicao',
      ...publishableFields(futureIso()),
    }
    const response = await publishRoute.PUT(jsonRequest('PUT', {}), {
      params: params(),
    })
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => call.fn),
      ['publish']
    )
  })
})

describe('seletor de Data Limite do formulário de vaga (DEV-167)', () => {
  test('o DateTimePicker de data_limite recebe after', () => {
    const formSource = readFileSync(
      new URL(
        '../../../../(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form.tsx',
        import.meta.url
      ),
      'utf8'
    )
    const fieldStart = formSource.indexOf('name="data_limite"')
    assert.ok(fieldStart > 0, 'campo data_limite não encontrado')
    const pickerEnd = formSource.indexOf('/>', fieldStart)
    const picker = formSource.slice(fieldStart, pickerEnd)
    assert.match(picker, /<DateTimePicker[\s\S]*\bafter=\{/)
  })
})
