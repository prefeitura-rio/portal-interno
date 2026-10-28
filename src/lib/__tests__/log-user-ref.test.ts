import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import {
  ANONYMOUS_USER_REF,
  getLogUserRef,
  redactCpfForLog,
} from '../log-user-ref.ts'

// Resolve o alias `@/` (tsconfig paths) para os imports de route-permissions.ts
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = new URL(`../../${specifier.slice(2)}.ts`, import.meta.url)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const { hasRouteAccess } = await import('../route-permissions.ts')

// CPFs sintéticos (dígitos verificadores válidos, sem titular real)
const CPF_A = '52998224725'
const CPF_B = '11144477735'

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.assinatura`
}

describe('getLogUserRef', () => {
  test('não contém o CPF do token', async () => {
    const token = makeToken({
      sub: CPF_A,
      preferred_username: CPF_A,
      cpf: CPF_A,
    })

    const ref = await getLogUserRef(token)

    assert.match(ref, /^u-[0-9a-f]{12}$/)
    assert.ok(!ref.includes(CPF_A))
    assert.ok(!ref.includes(CPF_A.slice(0, 6)))
  })

  test('é estável para o mesmo usuário no mesmo processo', async () => {
    const token = makeToken({ sub: CPF_A, exp: 1 })
    const otherTokenSameUser = makeToken({ sub: CPF_A, exp: 2 })

    assert.equal(
      await getLogUserRef(token),
      await getLogUserRef(otherTokenSameUser)
    )
  })

  test('distingue usuários diferentes', async () => {
    const refA = await getLogUserRef(makeToken({ preferred_username: CPF_A }))
    const refB = await getLogUserRef(makeToken({ preferred_username: CPF_B }))

    assert.notEqual(refA, refB)
  })

  test('não é um hash sem chave do CPF', async () => {
    const ref = await getLogUserRef(makeToken({ sub: CPF_A }))
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(CPF_A)
    )
    const plainHash = Buffer.from(digest).toString('hex')

    assert.ok(!plainHash.startsWith(ref.slice(2)))
  })

  test('token ausente, malformado ou sem identificador vira anônimo', async () => {
    assert.equal(await getLogUserRef(undefined), ANONYMOUS_USER_REF)
    assert.equal(await getLogUserRef(''), ANONYMOUS_USER_REF)
    assert.equal(await getLogUserRef('sem-pontos'), ANONYMOUS_USER_REF)
    assert.equal(await getLogUserRef('a.%%%.c'), ANONYMOUS_USER_REF)
    assert.equal(
      await getLogUserRef(`a.${base64Url('[1,2]')}.c`),
      ANONYMOUS_USER_REF
    )
    assert.equal(
      await getLogUserRef(makeToken({ name: 'Fulano' })),
      ANONYMOUS_USER_REF
    )
  })
})

describe('redactCpfForLog', () => {
  test('mascara CPF com e sem pontuação', () => {
    const text = `usuário ${CPF_A} e 111.444.777-35 não encontrados`

    const redacted = redactCpfForLog(text)

    assert.equal(
      redacted,
      'usuário [cpf omitido] e [cpf omitido] não encontrados'
    )
  })

  test('corta textos longos', () => {
    assert.equal(redactCpfForLog('x'.repeat(2000)).length, 500)
  })
})

describe('hasRouteAccess', () => {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  }
  let lines: string[] = []

  beforeEach(() => {
    lines = []
    const capture = (...args: unknown[]) => {
      lines.push(args.map(arg => JSON.stringify(arg) ?? String(arg)).join(' '))
    }
    console.log = capture
    console.warn = capture
    console.error = capture
  })

  afterEach(() => {
    console.log = original.log
    console.warn = original.warn
    console.error = original.error
  })

  test('acesso concedido não gera log', () => {
    assert.equal(hasRouteAccess('/', ['admin'], 'u-abc'), true)
    assert.equal(
      hasRouteAccess('/heimdall/users', ['superadmin'], 'u-abc'),
      true
    )

    assert.deepEqual(lines, [])
  })

  test('acesso negado continua negado e loga só a referência opaca', () => {
    const ref = 'u-0123456789ab'

    assert.equal(hasRouteAccess('/heimdall', ['go:admin'], ref), false)
    assert.equal(hasRouteAccess('/heimdall/users', ['go:admin'], ref), false)
    assert.equal(hasRouteAccess('/rota-inexistente', ['admin'], ref), false)
    assert.equal(hasRouteAccess('/', [], ref), false)
    assert.equal(hasRouteAccess('/', null, ref), false)

    assert.equal(lines.length, 5)
    for (const line of lines) {
      assert.ok(line.includes(ref))
      assert.ok(!line.includes('go:admin'), 'roles do usuário não vão ao log')
    }
  })
})
