import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-48: a troca do código de autorização por token no callback do Keycloak
// não pode responder 500 quando o endpoint de token devolve HTML/200 (WAF),
// erro ou falha de rede; os redirects precisam ser absolutos e o log precisa
// do status, do content-type e do início do corpo da resposta.

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
      const target = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(target))) {
        return nextResolve(target.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})

const { previewBodyForLog, readKeycloakTokenResponse } = await import(
  '../keycloak-token-response.ts'
)
const { refreshAccessToken } = await import('../token-refresh.ts')
const { GET } = await import('../../app/api/auth/callback/keycloak/route.ts')
const { NextRequest } = await import('next/server.js')

const APP_ORIGIN = 'https://admin.portal.invalid'
const KEYCLOAK_BASE_URL = 'https://keycloak.invalid/realms/teste/openid'
const CALLBACK_URL = `${APP_ORIGIN}/api/auth/callback/keycloak`
const LOGIN_ERROR_URL = `${APP_ORIGIN}/login-error`
const WAF_HTML =
  '<!DOCTYPE html>\n<html><head><title>Request Rejected</title></head><body>The requested URL was rejected.</body></html>'

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.assinatura`
}

function tokenResponseBody(): Record<string, unknown> {
  const exp = Math.floor(Date.now() / 1000) + 300
  return {
    access_token: makeToken({ sub: 'usuario-sintetico', exp }),
    refresh_token: makeToken({ sub: 'usuario-sintetico', exp: exp + 1800 }),
    expires_in: 300,
    refresh_expires_in: 2100,
  }
}

function htmlResponse(status: number): Response {
  return new Response(WAF_HTML, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

type ConsoleCall = unknown[]

let originalFetch: typeof fetch
let originalEnv: NodeJS.ProcessEnv
let errorCalls: ConsoleCall[]
let warnCalls: ConsoleCall[]

function mockFetch(handler: () => Promise<Response>): void {
  globalThis.fetch = mock.fn(handler) as unknown as typeof fetch
}

function callbackRequest(query: string): InstanceType<typeof NextRequest> {
  return new NextRequest(`${CALLBACK_URL}${query}`)
}

function loggedFailure(calls: ConsoleCall[]): Record<string, unknown> {
  const call = calls.find(
    args =>
      typeof args[0] === 'string' &&
      args[0].includes('Token exchange failed') &&
      typeof args[1] === 'object'
  )
  assert.ok(call, 'esperava o log da falha na troca do token')
  return call[1] as Record<string, unknown>
}

beforeEach(() => {
  originalFetch = globalThis.fetch
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL = KEYCLOAK_BASE_URL
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID = 'portal-interno'
  process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET = 'segredo-de-teste'
  process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI = CALLBACK_URL
  errorCalls = []
  warnCalls = []
  mock.method(console, 'error', (...args: unknown[]) => {
    errorCalls.push(args)
  })
  mock.method(console, 'warn', (...args: unknown[]) => {
    warnCalls.push(args)
  })
  mock.method(console, 'log', () => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env = originalEnv
  mock.restoreAll()
})

describe('readKeycloakTokenResponse', () => {
  test('HTML com status 200 é falha invalid_json, sem lançar', async () => {
    const result = await readKeycloakTokenResponse(htmlResponse(200))
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'invalid_json')
    assert.equal(result.diagnostics.status, 200)
    assert.equal(result.diagnostics.contentType, 'text/html; charset=utf-8')
    assert.ok(result.diagnostics.bodyPreview.startsWith('<!DOCTYPE html>'))
  })

  test('status de erro é http_error com o corpo no diagnóstico', async () => {
    const result = await readKeycloakTokenResponse(
      jsonResponse(400, { error: 'invalid_grant' })
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'http_error')
    assert.equal(result.diagnostics.status, 400)
    assert.match(result.diagnostics.bodyPreview, /invalid_grant/)
  })

  test('JSON 200 sem access_token é missing_access_token', async () => {
    const result = await readKeycloakTokenResponse(
      jsonResponse(200, { refresh_token: 'opaco-123', token_type: 'Bearer' })
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'missing_access_token')
    assert.doesNotMatch(result.diagnostics.bodyPreview, /opaco-123/)
  })

  test('JSON que não é objeto é invalid_json', async () => {
    const result = await readKeycloakTokenResponse(jsonResponse(200, ['x']))
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'invalid_json')
  })

  test('resposta válida devolve os tokens', async () => {
    const body = tokenResponseBody()
    const result = await readKeycloakTokenResponse(jsonResponse(200, body))
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.tokens.accessToken, body.access_token)
    assert.equal(result.tokens.refreshToken, body.refresh_token)
    assert.equal(result.tokens.expiresIn, 300)
    assert.equal(result.tokens.refreshExpiresIn, 2100)
  })
})

describe('previewBodyForLog', () => {
  test('mascara JWT, campos de token e CPF e corta em 200 caracteres', () => {
    const jwt = makeToken({ sub: 'x' })
    const preview = previewBodyForLog(
      `{"access_token":"opaco","id_token":"${jwt}","cpf":"529.982.247-25","pad":"${'a'.repeat(400)}"}`
    )
    assert.doesNotMatch(preview, /opaco/)
    assert.ok(!preview.includes(jwt))
    assert.doesNotMatch(preview, /529\.982\.247-25/)
    assert.ok(preview.length <= 200)
  })
})

describe('GET /api/auth/callback/keycloak (DEV-48)', () => {
  test('HTML/200 do endpoint de token redireciona à página de erro de login', async () => {
    mockFetch(async () => htmlResponse(200))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(response.cookies.get('access_token'), undefined)
    const logged = loggedFailure(errorCalls)
    assert.equal(logged.reason, 'invalid_json')
    assert.equal(logged.status, 200)
    assert.equal(logged.contentType, 'text/html; charset=utf-8')
    assert.match(String(logged.bodyPreview), /^<!DOCTYPE html>/)
  })

  test('erro 5xx do endpoint de token redireciona à página de erro de login', async () => {
    mockFetch(async () => htmlResponse(502))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    const logged = loggedFailure(errorCalls)
    assert.equal(logged.reason, 'http_error')
    assert.equal(logged.status, 502)
  })

  test('erro 400 (invalid_grant) redireciona à página de erro de login', async () => {
    mockFetch(async () => jsonResponse(400, { error: 'invalid_grant' }))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.match(String(loggedFailure(errorCalls).bodyPreview), /invalid_grant/)
  })

  test('JSON 200 sem access_token redireciona à página de erro de login', async () => {
    mockFetch(async () => jsonResponse(200, { token_type: 'Bearer' }))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(loggedFailure(errorCalls).reason, 'missing_access_token')
  })

  test('falha de rede redireciona à página de erro de login', async () => {
    mockFetch(async () => {
      throw new TypeError('fetch failed')
    })

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.ok(
      errorCalls.some(
        args =>
          typeof args[0] === 'string' &&
          args[0].includes('Token request failed')
      )
    )
  })

  test('sem code redireciona com URL absoluta, sem chamar o Keycloak', async () => {
    mockFetch(async () => {
      throw new Error('não deveria chamar o endpoint de token')
    })

    const response = await GET(callbackRequest('?error=access_denied'))

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
    assert.equal(
      (
        globalThis.fetch as unknown as ReturnType<typeof mock.fn>
      ).mock.callCount(),
      0
    )
    assert.ok(warnCalls.length > 0)
  })

  test('sem redirect URI configurado usa a origem da requisição', async () => {
    Reflect.deleteProperty(
      process.env,
      'NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI'
    )
    mockFetch(async () => htmlResponse(200))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.headers.get('location'), LOGIN_ERROR_URL)
  })

  test('sucesso grava os cookies e redireciona à base absoluta do portal', async () => {
    const body = tokenResponseBody()
    mockFetch(async () => jsonResponse(200, body))

    const response = await GET(callbackRequest('?code=codigo-sintetico'))

    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `${APP_ORIGIN}/`)
    assert.equal(response.cookies.get('access_token')?.value, body.access_token)
    assert.equal(
      response.cookies.get('refresh_token')?.value,
      body.refresh_token
    )
    assert.equal(errorCalls.length, 0)
  })
})

describe('refreshAccessToken (DEV-48)', () => {
  test('HTML/200 no refresh falha sem lançar e loga o diagnóstico', async () => {
    mockFetch(async () => htmlResponse(200))

    const result = await refreshAccessToken('refresh-sintetico')

    assert.equal(result.success, false)
    assert.equal(result.accessToken, undefined)
    const call = errorCalls.find(
      args => typeof args[0] === 'string' && args[0].includes('Refresh failed')
    )
    assert.ok(call)
    const logged = call[1] as Record<string, unknown>
    assert.equal(logged.reason, 'invalid_json')
    assert.equal(logged.status, 200)
    assert.equal(logged.contentType, 'text/html; charset=utf-8')
    assert.match(String(logged.bodyPreview), /^<!DOCTYPE html>/)
  })

  test('resposta válida devolve os tokens novos', async () => {
    const body = tokenResponseBody()
    mockFetch(async () => jsonResponse(200, body))

    const result = await refreshAccessToken('refresh-sintetico')

    assert.equal(result.success, true)
    assert.equal(result.accessToken, body.access_token)
    assert.equal(result.newRefreshToken, body.refresh_token)
  })
})
