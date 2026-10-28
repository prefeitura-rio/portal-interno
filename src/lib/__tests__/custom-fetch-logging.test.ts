import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { after, before, beforeEach, describe, mock, test } from 'node:test'
import { inspect } from 'node:util'

// Dados sintéticos: nenhum token ou dado pessoal real.
const TOKEN = 'token-sintetico-abc123'
const CPF = '12345678909'
const EMAIL = 'pessoa.sintetica@exemplo.test'

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const

const logged: string[] = []

type Mutator = <T>(url: string, options: RequestInit) => Promise<T>

let customFetchGoRio: Mutator
let customFetchHeimdall: Mutator

before(async () => {
  process.env.COURSES_BASE_API_URL = 'https://gorio.exemplo.test/'
  process.env.HEIMDALL_BASE_API_URL = 'https://heimdall.exemplo.test/'

  // Os mutators leem o access_token por `cookies()` de `next/headers`, que só
  // existe dentro de uma requisição do Next: troca o módulo por um stub.
  ;(globalThis as Record<string, unknown>).__customFetchTestCookies = {
    get: (name: string) =>
      name === 'access_token' ? { value: TOKEN } : undefined,
  }
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === 'next/headers') {
        return {
          url: 'data:text/javascript,export const cookies = async () => globalThis.__customFetchTestCookies',
          shortCircuit: true,
        }
      }
      return nextResolve(specifier, context)
    },
  })

  mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ cpf: CPF, email: EMAIL }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  )

  for (const method of CONSOLE_METHODS) {
    mock.method(console, method, (...args: unknown[]) => {
      logged.push(args.map(arg => inspect(arg, { depth: 10 })).join(' '))
    })
  }
  ;({ customFetchGoRio } = await import('../../../custom-fetch-gorio.ts'))
  ;({ customFetchHeimdall } = await import('../../../custom-fetch-heimdall.ts'))
})

after(() => {
  mock.restoreAll()
})

beforeEach(() => {
  logged.length = 0
})

const assertNothingSensitiveLogged = () => {
  const output = logged.join('\n')
  assert.ok(!output.includes(TOKEN), 'o token Bearer foi para o log')
  assert.ok(!output.includes(CPF), 'o CPF foi para o log')
  assert.ok(!output.includes(EMAIL), 'o e-mail foi para o log')
}

describe('mutators não logam credencial nem dado pessoal', () => {
  test('customFetchGoRio envia o token mas não o loga, nem URL com CPF nem corpo', async () => {
    const result = await customFetchGoRio<{
      status: number
      data: { cpf: string }
    }>(`/api/v1/empregabilidade/banco-curriculos/${CPF}`, {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL }),
    })

    assert.equal(result.status, 200)
    assert.equal(result.data.cpf, CPF)

    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: { arguments: [string, RequestInit] }[] }
    }
    const lastCall = fetchMock.mock.calls.at(-1)
    assert.ok(lastCall)
    const headers = lastCall.arguments[1].headers as Record<string, string>
    assert.equal(headers.Authorization, `Bearer ${TOKEN}`)

    assertNothingSensitiveLogged()
  })

  test('customFetchHeimdall não loga headers nem corpo da requisição', async () => {
    const result = await customFetchHeimdall<{ status: number }>(
      '/api/v1/users',
      {
        method: 'POST',
        body: JSON.stringify({ email: EMAIL, cpf: CPF }),
      }
    )

    assert.equal(result.status, 200)

    assertNothingSensitiveLogged()
  })
})
