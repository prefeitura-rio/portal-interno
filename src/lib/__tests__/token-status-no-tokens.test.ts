import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-68 (pentest vuln-0004): GET /api/auth/token-status lia os cookies
// HttpOnly access_token e refresh_token e devolvia os JWTs no corpo JSON,
// anulando o HttpOnly. O corpo agora leva só metadados, e o refresh proativo
// (use-token-refresh) decide pelo expiresAt/hasRefreshToken.

const SRC_ROOT = new URL('../../', import.meta.url)
const NEXT_HEADERS_STUB = 'stub:next-headers'

type CookieJar = Map<string, string>
const cookieState: { jar: CookieJar | null; fail: boolean } = {
  jar: null,
  fail: false,
}
;(globalThis as Record<string, unknown>).__tokenStatusTestCookies = cookieState

// Resolve o alias `@/`, `next/server` e os imports relativos sem extensão para
// Node puro; `next/headers` vira um stub cujo cookies() lê o jar do teste
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers') {
      return { url: NEXT_HEADERS_STUB, shortCircuit: true }
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
      const target = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(target))) {
        return nextResolve(target.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === NEXT_HEADERS_STUB) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          export async function cookies() {
            const state = globalThis.__tokenStatusTestCookies
            if (state.fail) throw new Error('cookies indisponíveis')
            const jar = state.jar ?? new Map()
            return {
              get(name) {
                return jar.has(name) ? { name, value: jar.get(name) } : undefined
              },
            }
          }
        `,
      }
    }
    return nextLoad(url, context)
  },
})

const { GET } = await import('../../app/api/auth/token-status/route.ts')
const { buildTokenStatus, decideTokenRefreshAction } = await import(
  '../token-status.ts'
)

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.assinatura-sintetica`
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

async function callTokenStatus(cookies: Record<string, string>) {
  cookieState.jar = new Map(Object.entries(cookies))
  const response = await GET()
  const text = await response.text()
  return { response, text, body: JSON.parse(text) as Record<string, unknown> }
}

const FORBIDDEN_KEYS = ['token', 'access_token', 'accessToken', 'refreshToken']

function assertNoTokens(
  text: string,
  body: Record<string, unknown>,
  secrets: string[]
) {
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(key in body, false, `corpo não pode ter a chave ${key}`)
  }
  for (const secret of secrets) {
    assert.equal(text.includes(secret), false, 'corpo vazou o valor do cookie')
  }
  assert.deepEqual(Object.keys(body).sort(), [
    'authenticated',
    'expiresAt',
    'hasRefreshToken',
    'isExpired',
    'message',
  ])
}

afterEach(() => {
  cookieState.jar = null
  cookieState.fail = false
})

describe('GET /api/auth/token-status não expõe os JWTs', () => {
  test('token válido com refresh: 200 só com metadados', async () => {
    const exp = nowSeconds() + 600
    const access = makeToken({ sub: 'usuario-sintetico', exp })
    const refresh = makeToken({ sub: 'usuario-sintetico', typ: 'Refresh' })

    const { response, text, body } = await callTokenStatus({
      access_token: access,
      refresh_token: refresh,
    })

    assert.equal(response.status, 200)
    assertNoTokens(text, body, [access, refresh])
    assert.equal(body.authenticated, true)
    assert.equal(body.isExpired, false)
    assert.equal(body.hasRefreshToken, true)
    assert.equal(body.expiresAt, exp * 1000)
    assert.equal(
      response.headers.get('cache-control')?.includes('no-store'),
      true
    )
  })

  test('token expirado sem refresh: 200, isExpired e hasRefreshToken false', async () => {
    const exp = nowSeconds() - 60
    const access = makeToken({ sub: 'usuario-sintetico', exp })

    const { response, text, body } = await callTokenStatus({
      access_token: access,
    })

    assert.equal(response.status, 200)
    assertNoTokens(text, body, [access])
    assert.equal(body.authenticated, false)
    assert.equal(body.isExpired, true)
    assert.equal(body.hasRefreshToken, false)
    assert.equal(body.expiresAt, exp * 1000)
  })

  test('sem access_token: 401 sem o refresh_token no corpo', async () => {
    const refresh = makeToken({ sub: 'usuario-sintetico', typ: 'Refresh' })

    const { response, text, body } = await callTokenStatus({
      refresh_token: refresh,
    })

    assert.equal(response.status, 401)
    assertNoTokens(text, body, [refresh])
    assert.equal(body.authenticated, false)
    assert.equal(body.hasRefreshToken, true)
    assert.equal(body.expiresAt, null)
  })

  test('erro ao ler cookies: 500 só com metadados', async t => {
    t.mock.method(console, 'error', () => {})
    cookieState.fail = true

    const response = await GET()
    const text = await response.text()
    const body = JSON.parse(text) as Record<string, unknown>

    assert.equal(response.status, 500)
    assertNoTokens(text, body, [])
    assert.equal(body.authenticated, false)
  })

  test('token sem exp legível: expiresAt null', () => {
    const status = buildTokenStatus('nao-e-um-jwt', undefined)
    assert.equal(status.expiresAt, null)
    assert.equal(status.hasRefreshToken, false)
  })
})

describe('refresh proativo (use-token-refresh) decide só pelos metadados', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0)
  const minutes = (n: number) => now + n * 60 * 1000

  test('renova a 2 minutos ou menos da expiração', () => {
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: false, hasRefreshToken: true, expiresAt: minutes(2) },
        now,
        2
      ),
      'refresh'
    )
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: false, hasRefreshToken: true, expiresAt: minutes(1) },
        now,
        2
      ),
      'refresh'
    )
  })

  test('não renova longe da expiração nem sem expiresAt', () => {
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: false, hasRefreshToken: true, expiresAt: minutes(10) },
        now,
        2
      ),
      'none'
    )
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: false, hasRefreshToken: true, expiresAt: null },
        now,
        2
      ),
      'none'
    )
  })

  test('expirado com refresh_token: renova', () => {
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: true, hasRefreshToken: true, expiresAt: minutes(-1) },
        now,
        2
      ),
      'refresh'
    )
  })

  test('expirado sem refresh_token: logout', () => {
    assert.equal(
      decideTokenRefreshAction(
        { isExpired: true, hasRefreshToken: false, expiresAt: minutes(-1) },
        now,
        2
      ),
      'logout'
    )
  })

  test('fluxo ponta a ponta: status do endpoint leva à mesma decisão', async () => {
    const access = makeToken({
      sub: 'usuario-sintetico',
      exp: nowSeconds() + 90,
    })
    const { body } = await callTokenStatus({
      access_token: access,
      refresh_token: makeToken({ typ: 'Refresh' }),
    })
    assert.equal(
      decideTokenRefreshAction(
        body as {
          isExpired: boolean
          hasRefreshToken: boolean
          expiresAt: number | null
        },
        Date.now(),
        2
      ),
      'refresh'
    )

    const expired = makeToken({
      sub: 'usuario-sintetico',
      exp: nowSeconds() - 5,
    })
    const { body: expiredBody } = await callTokenStatus({
      access_token: expired,
    })
    assert.equal(
      decideTokenRefreshAction(
        expiredBody as {
          isExpired: boolean
          hasRefreshToken: boolean
          expiresAt: number | null
        },
        Date.now(),
        2
      ),
      'logout'
    )
  })
})
