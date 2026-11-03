import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-180: o BFF de Empresas só conferia se o CNPJ tinha 14 dígitos; o dígito
// verificador era (só em parte) responsabilidade do formulário. Uma chamada
// direta criava empresa com qualquer sequência de 14 dígitos. Aqui os handlers
// reais são chamados com o cliente Orval da API de empregabilidade substituído
// por um stub (empresas e CNPJs sintéticos).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type ApiCall = { fn: string; cnpj?: string; body?: Record<string, unknown> }
type ReceitaReply = { status: number; data: unknown } | 'throw'
type TestGlobals = typeof globalThis & {
  __dev180Calls?: ApiCall[]
  __dev181Lookups?: string[]
  __dev181Receita?: ReceitaReply
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/cache': moduleUrl(`
    export function revalidateTag() {}
  `),
  '@/http-gorio/empregabilidade-empresas/empregabilidade-empresas': moduleUrl(`
    function record(call) {
      globalThis.__dev180Calls?.push(call)
    }
    export async function getApiV1EmpregabilidadeEmpresas() {
      return { status: 200, data: { data: [] } }
    }
    export async function postApiV1EmpregabilidadeEmpresas(body) {
      record({ fn: 'create', body })
      return { status: 201, data: { ...body } }
    }
    export async function getApiV1EmpregabilidadeEmpresasCnpj(cnpj) {
      record({ fn: 'get', cnpj })
      return { status: 200, data: { cnpj, razao_social: 'Empresa sintética' } }
    }
    export async function putApiV1EmpregabilidadeEmpresasCnpj(cnpj, body) {
      record({ fn: 'update', cnpj, body })
      return { status: 200, data: { ...body, cnpj } }
    }
    export async function deleteApiV1EmpregabilidadeEmpresasCnpj(cnpj) {
      record({ fn: 'delete', cnpj })
      return { status: 200, data: {} }
    }
    export async function getApiV1EmpregabilidadeEmpresasConsultaCnpjCnpj(cnpj) {
      globalThis.__dev181Lookups?.push(cnpj)
      const reply = globalThis.__dev181Receita
      if (reply === 'throw') {
        throw new TypeError('fetch failed')
      }
      return reply ?? {
        status: 200,
        data: { cnpj, razao_social: 'EMPRESA SINTETICA OFICIAL LTDA' },
      }
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
const empresasRoute = await import('../route.ts')
const empresaRoute = await import('../[cnpj]/route.ts')
const {
  CNPJ_CHECK_DIGITS_MESSAGE,
  CNPJ_LENGTH_MESSAGE,
  CNPJ_REQUIRED_MESSAGE,
  completeCNPJ,
  getCNPJValidationError,
  validateCNPJ,
} = await import('../../../../../lib/cnpj-validator.ts')

// CNPJs sintéticos com dígitos verificadores válidos
const VALID_CNPJ = '11222333000181'
const VALID_CNPJ_MASKED = '11.222.333/0001-81'
const OTHER_VALID_CNPJ = '00012345000165'
// 14 dígitos com dígito verificador errado (o exemplo da issue e um quase-válido)
const INVALID_CNPJS = ['12345678901234', '11222333000182', '11222333000191']

function jsonRequest(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/empregabilidade/empresas', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function empresaBody(cnpj?: unknown): Record<string, unknown> {
  return {
    ...(cnpj === undefined ? {} : { cnpj }),
    razao_social: 'Empresa Fictícia',
    descricao: 'Descrição sintética da empresa',
    url_logo: 'https://example.com/logo.png',
  }
}

const params = (cnpj: string) => ({ params: Promise.resolve({ cnpj }) })

function calls(): ApiCall[] {
  return testGlobals.__dev180Calls ?? []
}

beforeEach(() => {
  testGlobals.__dev180Calls = []
  testGlobals.__dev181Lookups = []
  testGlobals.__dev181Receita = undefined
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ENVIRONMENT')
})

describe('validador de CNPJ (DEV-180)', () => {
  test('aceita CNPJ com dígitos verificadores válidos, com ou sem máscara', () => {
    assert.equal(validateCNPJ(VALID_CNPJ), true)
    assert.equal(validateCNPJ(VALID_CNPJ_MASKED), true)
    assert.equal(validateCNPJ(OTHER_VALID_CNPJ), true)
    assert.equal(validateCNPJ('98765432000198'), true)
  })

  test('recusa dígito verificador errado', () => {
    for (const cnpj of INVALID_CNPJS) {
      assert.equal(validateCNPJ(cnpj), false, cnpj)
      assert.equal(getCNPJValidationError(cnpj), CNPJ_CHECK_DIGITS_MESSAGE)
    }
  })

  test('recusa sequência de um só dígito, mesmo passando no cálculo', () => {
    for (let digit = 0; digit <= 9; digit++) {
      const cnpj = String(digit).repeat(14)
      assert.equal(getCNPJValidationError(cnpj), CNPJ_CHECK_DIGITS_MESSAGE)
    }
  })

  test('recusa tamanho diferente de 14 dígitos', () => {
    assert.equal(getCNPJValidationError('1122233300018'), CNPJ_LENGTH_MESSAGE)
    assert.equal(getCNPJValidationError('112223330001811'), CNPJ_LENGTH_MESSAGE)
    assert.equal(getCNPJValidationError('abc'), CNPJ_LENGTH_MESSAGE)
  })

  test('recusa ausente, vazio ou que não é texto', () => {
    assert.equal(getCNPJValidationError(undefined), CNPJ_REQUIRED_MESSAGE)
    assert.equal(getCNPJValidationError(null), CNPJ_REQUIRED_MESSAGE)
    assert.equal(getCNPJValidationError('   '), CNPJ_REQUIRED_MESSAGE)
    assert.equal(getCNPJValidationError(11222333000181), CNPJ_REQUIRED_MESSAGE)
  })

  test('completeCNPJ gera os dígitos verificadores', () => {
    assert.equal(completeCNPJ('112223330001'), VALID_CNPJ)
    assert.equal(completeCNPJ('000123450001'), OTHER_VALID_CNPJ)
    for (const base of ['000000000001', '009999990001', '004213370001']) {
      assert.equal(validateCNPJ(completeCNPJ(base)), true, base)
    }
    assert.throws(() => completeCNPJ('1122233300'))
  })
})

describe('POST /api/empregabilidade/empresas (DEV-180)', () => {
  for (const cnpj of INVALID_CNPJS) {
    test(`recusa com 400 CNPJ ${cnpj}, sem criar a empresa`, async () => {
      const response = await empresasRoute.POST(
        jsonRequest('POST', empresaBody(cnpj))
      )
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.equal(body.error, CNPJ_CHECK_DIGITS_MESSAGE)
      assert.deepEqual(calls(), [])
    })
  }

  test('recusa com 400 CNPJ de um dígito repetido, sem criar a empresa', async () => {
    const response = await empresasRoute.POST(
      jsonRequest('POST', empresaBody('00000000000000'))
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })

  test('recusa com 400 CNPJ com menos de 14 dígitos', async () => {
    const response = await empresasRoute.POST(
      jsonRequest('POST', empresaBody('1122233300018'))
    )
    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, CNPJ_LENGTH_MESSAGE)
    assert.deepEqual(calls(), [])
  })

  test('segue exigindo cnpj e razao_social', async () => {
    const response = await empresasRoute.POST(
      jsonRequest('POST', empresaBody())
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })

  test('cria empresa com CNPJ válido', async () => {
    const response = await empresasRoute.POST(
      jsonRequest('POST', empresaBody(VALID_CNPJ))
    )
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.success, true)
    assert.deepEqual(
      calls().map(call => [call.fn, call.body?.cnpj]),
      [['create', VALID_CNPJ]]
    )
  })

  test('CNPJ válido com máscara é enviado à API só com os dígitos', async () => {
    const response = await empresasRoute.POST(
      jsonRequest('POST', empresaBody(VALID_CNPJ_MASKED))
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => [call.fn, call.body?.cnpj]),
      [['create', VALID_CNPJ]]
    )
  })
})

describe('PUT /api/empregabilidade/empresas/[cnpj] (DEV-180)', () => {
  for (const cnpj of INVALID_CNPJS) {
    test(`recusa com 400 CNPJ ${cnpj}, sem atualizar`, async () => {
      const response = await empresaRoute.PUT(
        jsonRequest('PUT', empresaBody(cnpj)),
        params(cnpj)
      )
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.equal(body.error, CNPJ_CHECK_DIGITS_MESSAGE)
      assert.deepEqual(calls(), [])
    })
  }

  test('atualiza empresa com CNPJ válido', async () => {
    const response = await empresaRoute.PUT(
      jsonRequest('PUT', empresaBody(VALID_CNPJ)),
      params(VALID_CNPJ_MASKED)
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      calls().map(call => [call.fn, call.cnpj]),
      [['update', VALID_CNPJ]]
    )
  })

  test('segue recusando CNPJ do corpo diferente do da URL', async () => {
    const response = await empresaRoute.PUT(
      jsonRequest('PUT', empresaBody(OTHER_VALID_CNPJ)),
      params(VALID_CNPJ)
    )
    assert.equal(response.status, 400)
    assert.deepEqual(calls(), [])
  })
})

describe('GET e DELETE /api/empregabilidade/empresas/[cnpj] (DEV-180)', () => {
  test('empresa antiga com dígito verificador errado ainda pode ser lida e excluída', async () => {
    const cnpj = INVALID_CNPJS[0]
    const getResponse = await empresaRoute.GET(
      new Request('http://localhost'),
      params(cnpj)
    )
    assert.equal(getResponse.status, 200)
    const deleteResponse = await empresaRoute.DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      params(cnpj)
    )
    assert.equal(deleteResponse.status, 200)
    assert.deepEqual(
      calls().map(call => call.fn),
      ['get', 'delete']
    )
  })
})

// DEV-181: decisão de produto (Frederico Zolio) — fora de staging o POST confere
// o CNPJ na Receita Federal (consulta RMI da API) e cria com a razão social
// oficial; Receita fora do ar recusa; staging mantém o atalho de teste.
describe('POST /api/empregabilidade/empresas — Receita Federal (DEV-181)', () => {
  const OFFICIAL_NAME = 'EMPRESA SINTETICA OFICIAL LTDA'

  async function post(cnpj: string, razaoSocial = 'Nome digitado livremente') {
    return empresasRoute.POST(
      jsonRequest('POST', { ...empresaBody(cnpj), razao_social: razaoSocial })
    )
  }

  for (const environment of [undefined, 'production']) {
    test(`fora de staging (${environment ?? 'sem variável'}) cria com a razão social oficial`, async () => {
      if (environment) {
        process.env.NEXT_PUBLIC_ENVIRONMENT = environment
      }
      const response = await post(VALID_CNPJ_MASKED)
      assert.equal(response.status, 200)
      assert.deepEqual(testGlobals.__dev181Lookups, [VALID_CNPJ])
      assert.deepEqual(
        calls().map(call => [
          call.fn,
          call.body?.cnpj,
          call.body?.razao_social,
        ]),
        [['create', VALID_CNPJ, OFFICIAL_NAME]]
      )
    })
  }

  test('CNPJ que não existe na Receita é recusado com 422, sem criar', async () => {
    testGlobals.__dev181Receita = {
      status: 404,
      data: { error: 'CNPJ não encontrado' },
    }
    const response = await post(OTHER_VALID_CNPJ)
    assert.equal(response.status, 422)
    const body = await response.json()
    assert.equal(body.code, 'CNPJ_NOT_FOUND')
    assert.match(body.error, /não encontrado/)
    assert.deepEqual(testGlobals.__dev181Lookups, [OTHER_VALID_CNPJ])
    assert.deepEqual(calls(), [])
  })

  test('CNPJ recusado pela consulta (400) não cria a empresa', async () => {
    testGlobals.__dev181Receita = { status: 400, data: { error: 'inválido' } }
    const response = await post(VALID_CNPJ)
    assert.equal(response.status, 400)
    assert.equal((await response.json()).code, 'CNPJ_INVALID')
    assert.deepEqual(calls(), [])
  })

  for (const [label, reply] of [
    ['500 da consulta', { status: 500, data: { error: 'RMI fora do ar' } }],
    ['502 do gateway', { status: 502, data: 'Bad Gateway' }],
    ['erro de rede', 'throw'],
    ['200 sem razão social', { status: 200, data: { cnpj: VALID_CNPJ } }],
  ] as const) {
    test(`Receita indisponível (${label}) recusa com 503, sem criar`, async () => {
      testGlobals.__dev181Receita = reply as ReceitaReply
      const response = await post(VALID_CNPJ)
      assert.equal(response.status, 503)
      const body = await response.json()
      assert.equal(body.code, 'RECEITA_UNAVAILABLE')
      assert.deepEqual(calls(), [])
    })
  }

  for (const status of [401, 403]) {
    test(`consulta recusada por autorização (${status}) devolve ${status}, sem criar`, async () => {
      testGlobals.__dev181Receita = { status, data: { error: 'unauthorized' } }
      const response = await post(VALID_CNPJ)
      assert.equal(response.status, status)
      assert.equal((await response.json()).code, 'RECEITA_UNAUTHORIZED')
      assert.deepEqual(calls(), [])
    })
  }

  test('dígito verificador errado é recusado antes de consultar a Receita', async () => {
    const response = await post(INVALID_CNPJS[0])
    assert.equal(response.status, 400)
    assert.deepEqual(testGlobals.__dev181Lookups, [])
    assert.deepEqual(calls(), [])
  })

  test('em staging não consulta a Receita e mantém a razão social enviada', async () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = 'staging'
    testGlobals.__dev181Receita = { status: 404, data: {} }
    const response = await post(VALID_CNPJ, 'EMPRESA TESTE 123')
    assert.equal(response.status, 200)
    assert.deepEqual(testGlobals.__dev181Lookups, [])
    assert.deepEqual(
      calls().map(call => [call.fn, call.body?.cnpj, call.body?.razao_social]),
      [['create', VALID_CNPJ, 'EMPRESA TESTE 123']]
    )
  })
})
