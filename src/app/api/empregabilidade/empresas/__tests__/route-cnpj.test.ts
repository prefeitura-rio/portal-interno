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
type TestGlobals = typeof globalThis & { __dev180Calls?: ApiCall[] }
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
