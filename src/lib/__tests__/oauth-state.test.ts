import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-262: o login pelo Keycloak não gerava nem conferia o `state` do OAuth,
// então o callback trocava qualquer `code` da URL por token (CSRF de login /
// fixação de sessão). Agora todo início de login grava um state aleatório em
// cookie httpOnly e o callback só troca o code quando o state bate.

// Resolve o alias `@/` (tsconfig paths), `next/server` e os imports relativos
// sem extensão dos módulos de src/ (padrão do bundler do Next) para Node puro
const SRC_ROOT = new URL('../../', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
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

const {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
  buildKeycloakAuthorizationUrl,
  generateOAuthState,
  isWellFormedOAuthState,
  verifyOAuthState,
} = await import('../oauth-state.ts')
const { GET: login } = await import('../../app/api/auth/login/route.ts')
const { GET: callback } = await import(
  '../../app/api/auth/callback/keycloak/route.ts'
)
const { middleware } = await import('../../middleware.ts')
const { NextRequest } = await import('next/server.js')

const APP_ORIGIN = 'https://admin.portal.invalid'
const KEYCLOAK_BASE_URL = 'https://keycloak.invalid/realms/teste/openid'
const CALLBACK_URL = `${APP_ORIGIN}/api/auth/callback/keycloak`
const LOGIN_ERROR_URL = `${APP_ORIGIN}/login-error`

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.assinatura`
}

function tokenResponse(): Response {
  const exp = Math.floor(Date.now() / 1000) + 300
  return new Response(
    JSON.stringify({
      access_token: makeToken({ sub: 'usuario-sintetico', exp }),
      refresh_token: makeToken({ sub: 'usuario-sintetico', exp: exp + 1800 }),
      expires_in: 300,
      refresh_expires_in: 2100,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

function request(
  url: string,
  cookies: Record<string, string> = {}
): InstanceType<typeof NextRequest> {
  const headers = new Headers()
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest(url, { headers })
}

/** O Set-Cookie do state na resposta, com os atributos. */
function stateSetCookie(response: Response): string {
  const header = response.headers
    .getSetCookie()
    .find(value => value.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`))
  assert.ok(header, 'esperava o Set-Cookie do state')
  return header
}

/** Callback recusado não mexe no state de um login legítimo em andamento. */
function assertStateUntouched(response: Response): void {
  assert.equal(
    response.headers
      .getSetCookie()
      .some(value => value.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`)),
    false
  )
}

function assertStateCleared(response: Response): void {
  const header = stateSetCookie(response)
  assert.match(header, new RegExp(`^${OAUTH_STATE_COOKIE_NAME}=;`))
  assert.match(header, /Max-Age=0/i)
}

let tokenCalls: number
let warnCalls: unknown[][]
let originalFetch: typeof fetch
let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  originalFetch = globalThis.fetch
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL = KEYCLOAK_BASE_URL
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID = 'portal-interno'
  process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET = 'segredo-de-teste'
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI = CALLBACK_URL
  tokenCalls = 0
  warnCalls = []
  globalThis.fetch = (async () => {
    tokenCalls++
    return tokenResponse()
  }) as typeof fetch
  mock.method(console, 'warn', (...args: unknown[]) => {
    warnCalls.push(args)
  })
  mock.method(console, 'log', () => {})
  mock.method(console, 'error', () => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env = originalEnv
  mock.restoreAll()
})

describe('state do OAuth (DEV-262)', () => {
  test('gera valores de 256 bits em base64url, sempre diferentes', () => {
    const values = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const state = generateOAuthState()
      assert.equal(isWellFormedOAuthState(state), true, state)
      values.add(state)
    }
    assert.equal(values.size, 200)
  })

  test('verifyOAuthState só aceita state igual ao do cookie', () => {
    const state = generateOAuthState()
    assert.deepEqual(verifyOAuthState(state, state), { ok: true })
    assert.deepEqual(verifyOAuthState(null, state), {
      ok: false,
      reason: 'missing_query_state',
    })
    assert.deepEqual(verifyOAuthState(state, undefined), {
      ok: false,
      reason: 'missing_cookie',
    })
    assert.deepEqual(verifyOAuthState('', ''), {
      ok: false,
      reason: 'missing_query_state',
    })
    assert.deepEqual(verifyOAuthState('abc', 'abc'), {
      ok: false,
      reason: 'missing_cookie',
    })
    assert.deepEqual(verifyOAuthState(generateOAuthState(), state), {
      ok: false,
      reason: 'mismatch',
    })
    assert.deepEqual(verifyOAuthState(`${state}x`, state), {
      ok: false,
      reason: 'mismatch',
    })
  })

  test('a URL de autorização leva client_id, redirect_uri, code e state', () => {
    const state = generateOAuthState()
    const url = new URL(buildKeycloakAuthorizationUrl(state))
    assert.equal(url.origin + url.pathname, `${KEYCLOAK_BASE_URL}/auth`)
    assert.equal(url.searchParams.get('client_id'), 'portal-interno')
    assert.equal(url.searchParams.get('redirect_uri'), CALLBACK_URL)
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('state'), state)
  })
})

describe('GET /api/auth/login (DEV-262)', () => {
  test('grava o state em cookie httpOnly curto e redireciona ao Keycloak com ele', () => {
    const response = login(request(`${APP_ORIGIN}/api/auth/login`))

    assert.equal(response.status, 307)
    const location = new URL(response.headers.get('location') ?? '')
    assert.equal(
      location.origin + location.pathname,
      `${KEYCLOAK_BASE_URL}/auth`
    )
    const state = location.searchParams.get('state')
    assert.equal(isWellFormedOAuthState(state), true)
    assert.equal(response.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value, state)

    const header = stateSetCookie(response)
    assert.match(header, /HttpOnly/i)
    assert.match(header, /Secure/i)
    assert.match(header, /SameSite=lax/i)
    assert.match(header, /Path=\//)
    assert.doesNotMatch(header, /Domain=/i)
    assert.match(header, new RegExp(`Max-Age=${OAUTH_STATE_MAX_AGE_SECONDS}`))
    assert.equal(response.headers.get('cache-control'), 'no-store')
  })

  test('cada navegador recebe um state próprio', () => {
    const first = login(request(`${APP_ORIGIN}/api/auth/login`))
    const second = login(request(`${APP_ORIGIN}/api/auth/login`))
    assert.notEqual(
      first.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value,
      second.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value
    )
  })

  test('reaproveita o state válido do cookie (login em outra aba)', () => {
    const state = generateOAuthState()
    const response = login(
      request(`${APP_ORIGIN}/api/auth/login`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )
    const location = new URL(response.headers.get('location') ?? '')
    assert.equal(location.searchParams.get('state'), state)
    assert.equal(response.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value, state)
  })

  test('cookie malformado não é reaproveitado', () => {
    const response = login(
      request(`${APP_ORIGIN}/api/auth/login`, {
        [OAUTH_STATE_COOKIE_NAME]: 'valor-curto',
      })
    )
    const state = response.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value
    assert.notEqual(state, 'valor-curto')
    assert.equal(isWellFormedOAuthState(state), true)
  })
})

describe('middleware sem sessão (DEV-262)', () => {
  test('página protegida redireciona ao Keycloak com state e grava o cookie', async () => {
    const response = await middleware(request(`${APP_ORIGIN}/gorio/courses`))

    assert.ok(response)
    assert.equal(response.status, 307)
    const location = new URL(response.headers.get('location') ?? '')
    assert.equal(
      location.origin + location.pathname,
      `${KEYCLOAK_BASE_URL}/auth`
    )
    const state = location.searchParams.get('state')
    assert.equal(isWellFormedOAuthState(state), true)
    assert.equal(response.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value, state)
    assert.match(stateSetCookie(response), /HttpOnly/i)
  })

  test('a rota de login é pública no middleware', async () => {
    const response = await middleware(request(`${APP_ORIGIN}/api/auth/login`))
    assert.ok(response)
    assert.equal(response.headers.get('x-middleware-next'), '1')
  })
})

describe('GET /api/auth/callback/keycloak valida o state (DEV-262)', () => {
  test('sem state na query: não troca o code e vai para /login-error', async () => {
    const state = generateOAuthState()
    const response = await callback(
      request(`${CALLBACK_URL}?code=codigo-do-atacante`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(tokenCalls, 0)
    assert.equal(response.cookies.get('access_token'), undefined)
    assert.equal(response.cookies.get('refresh_token'), undefined)
    assertStateUntouched(response)
  })

  test('sem cookie de state (login não iniciado neste navegador): recusa', async () => {
    const response = await callback(
      request(
        `${CALLBACK_URL}?code=codigo-do-atacante&state=${generateOAuthState()}`
      )
    )

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(tokenCalls, 0)
    assert.equal(response.cookies.get('access_token'), undefined)
  })

  test('state diferente do cookie: recusa', async () => {
    const response = await callback(
      request(
        `${CALLBACK_URL}?code=codigo-do-atacante&state=${generateOAuthState()}`,
        { [OAUTH_STATE_COOKIE_NAME]: generateOAuthState() }
      )
    )

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(tokenCalls, 0)
    assert.equal(response.cookies.get('access_token'), undefined)
    assertStateUntouched(response)
  })

  test('callback sem state (iframe do logout do gov.br) não derruba o login em andamento', async () => {
    const start = login(request(`${APP_ORIGIN}/api/auth/login`))
    const state = start.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value
    assert.ok(state)

    const stray = await callback(
      request(`${CALLBACK_URL}?code=codigo-sem-state`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )
    assert.equal(stray.headers.get('location'), LOGIN_ERROR_URL)
    assertStateUntouched(stray)

    const legit = await callback(
      request(`${CALLBACK_URL}?code=codigo-legitimo&state=${state}`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )
    assert.equal(legit.headers.get('location'), `${APP_ORIGIN}/`)
    assert.equal(tokenCalls, 1)
    assertStateCleared(legit)
  })

  test('state certo e falha na troca do code: consome o state', async () => {
    globalThis.fetch = (async () => {
      tokenCalls++
      return new Response('{"error":"invalid_grant"}', {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch
    const state = generateOAuthState()

    const response = await callback(
      request(`${CALLBACK_URL}?code=codigo-expirado&state=${state}`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(tokenCalls, 1)
    assert.equal(response.cookies.get('access_token'), undefined)
    assertStateCleared(response)
  })

  test('a recusa loga o motivo sem o code nem o state', async () => {
    const state = generateOAuthState()
    await callback(
      request(`${CALLBACK_URL}?code=codigo-do-atacante&state=${state}`, {
        [OAUTH_STATE_COOKIE_NAME]: generateOAuthState(),
      })
    )

    const logged = JSON.stringify(warnCalls)
    assert.match(logged, /invalid OAuth state/)
    assert.match(logged, /mismatch/)
    assert.doesNotMatch(logged, /codigo-do-atacante/)
    assert.ok(!logged.includes(state))
  })

  test('state igual ao do cookie: troca o code, grava a sessão e consome o state', async () => {
    const start = login(request(`${APP_ORIGIN}/api/auth/login`))
    const state = new URL(start.headers.get('location') ?? '').searchParams.get(
      'state'
    )
    assert.ok(state)

    const response = await callback(
      request(`${CALLBACK_URL}?code=codigo-legitimo&state=${state}`, {
        [OAUTH_STATE_COOKIE_NAME]: state,
      })
    )

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `${APP_ORIGIN}/`)
    assert.equal(tokenCalls, 1)
    assert.ok(response.cookies.get('access_token')?.value)
    assert.ok(response.cookies.get('refresh_token')?.value)
    assertStateCleared(response)
  })
})

describe('nenhum início de login monta a URL do Keycloak sem state (DEV-262)', () => {
  const read = (path: string) =>
    readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

  test('dashboard, middleware e páginas de login usam o fluxo com state', () => {
    for (const path of [
      'app/(private)/(app)/(dashboard)/page.tsx',
      'middleware.ts',
      'app/(private)/session-expired/page.tsx',
      'app/(public)/login-error/page.tsx',
    ]) {
      assert.doesNotMatch(read(path), /response_type=code/, path)
    }
  })

  test('o logout leva o navegador à rota de login, não direto ao Keycloak', () => {
    const source = read('hooks/use-logout.ts')
    assert.doesNotMatch(source, /window\.location\.href = redirectUri/)
    assert.match(source, /window\.location\.href = LOGIN_ROUTE/)
  })
})
