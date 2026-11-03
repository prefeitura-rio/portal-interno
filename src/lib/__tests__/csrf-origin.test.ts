import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-198 (pentest vuln-0003): os cookies de sessão são SameSite=Lax e as
// rotas de mutação de /api não conferiam Origin/Sec-Fetch-Site, então um site
// irmão (same-site) podia disparar POST/PUT/PATCH/DELETE com a sessão do
// usuário. Aqui o middleware real é exercitado com NextRequest.

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

process.env.HEIMDALL_BASE_API_URL = 'https://heimdall.test/'

const { NextRequest } = await import('next/server')
const { middleware } = await import('../../middleware.ts')
const { resetHeimdallUserServerCache } = await import(
  '../heimdall-user-cache.ts'
)
const { checkCsrfOrigin } = await import('../csrf-origin.ts')

const PORTAL = 'https://admin.staging.app.dados.rio'
const MUTATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

function makeToken(sub: string): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 600
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub, exp })}.assinatura`
}

const ADMIN_TOKEN = makeToken('u-admin')

const originalFetch = globalThis.fetch
const originalWarn = console.warn
let logLines: string[] = []

beforeEach(() => {
  resetHeimdallUserServerCache()
  logLines = []
  console.warn = (...args: unknown[]) => {
    logLines.push(args.map(arg => String(arg)).join(' '))
  }
  // Heimdall falso: o token de teste é admin
  globalThis.fetch = (async () =>
    Response.json({ id: 1, roles: ['admin'] })) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

async function callApi(
  path: string,
  method: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  const request = new NextRequest(`${PORTAL}${path}`, {
    method,
    headers: { cookie: `access_token=${ADMIN_TOKEN}`, ...headers },
  })
  const response = await middleware(request)
  assert.ok(response, `middleware não respondeu para ${method} ${path}`)
  return response
}

function passedThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

async function assertCsrfDenied(response: Response): Promise<void> {
  assert.equal(response.status, 403)
  assert.equal(passedThrough(response), false)
  assert.deepEqual(await response.json(), { error: 'Forbidden' })
}

describe('middleware: CSRF nas rotas de mutação de /api (DEV-198)', () => {
  test('Origin externa em POST/PUT/PATCH/DELETE recebe 403', async () => {
    for (const method of MUTATIONS) {
      for (const origin of [
        'https://evil.example',
        // site irmão: same-site, os cookies Lax iriam junto
        'https://staging.app.dados.rio',
        'http://admin.staging.app.dados.rio.evil.example',
        'null',
        'not a url',
      ]) {
        await assertCsrfDenied(
          await callApi('/api/courses', method, {
            origin,
            host: 'admin.staging.app.dados.rio',
          })
        )
      }
    }
    assert.ok(logLines.every(line => line.includes('(CSRF)')))
    assert.ok(logLines.some(line => line.includes('/api/courses')))
  })

  test('a recusa vale também para rotas públicas e sem regra', async () => {
    for (const path of [
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/rota-inexistente',
    ]) {
      await assertCsrfDenied(
        await callApi(path, 'POST', { origin: 'https://evil.example' })
      )
    }
  })

  test('sem Origin, Sec-Fetch-Site cross-site ou same-site recebe 403', async () => {
    for (const site of ['cross-site', 'same-site']) {
      await assertCsrfDenied(
        await callApi('/api/courses', 'POST', { 'sec-fetch-site': site })
      )
    }
  })

  test('a mesma origem segue para o RBAC e o handler', async () => {
    for (const method of MUTATIONS) {
      const response = await callApi('/api/courses', method, {
        origin: PORTAL,
        host: 'admin.staging.app.dados.rio',
        'sec-fetch-site': 'same-origin',
      })
      assert.equal(passedThrough(response), true, method)
    }
  })

  test('atrás do proxy: TLS terminado antes do Next e X-Forwarded-Host', async () => {
    const request = new NextRequest('http://10.0.0.7:3000/api/courses', {
      method: 'POST',
      headers: {
        cookie: `access_token=${ADMIN_TOKEN}`,
        origin: PORTAL,
        host: '10.0.0.7:3000',
        'x-forwarded-host': 'admin.staging.app.dados.rio',
      },
    })
    const response = await middleware(request)
    assert.ok(response)
    assert.equal(passedThrough(response), true)
  })

  test('sem Origin nem Sec-Fetch-Site (cliente não navegador) segue', async () => {
    assert.equal(passedThrough(await callApi('/api/courses', 'POST')), true)
    assert.equal(
      passedThrough(
        await callApi('/api/courses', 'POST', { 'sec-fetch-site': 'none' })
      ),
      true
    )
  })

  test('mutação de mesma origem continua sujeita ao RBAC', async () => {
    const response = await middleware(
      new NextRequest(`${PORTAL}/api/courses`, {
        method: 'POST',
        headers: { origin: PORTAL },
      })
    )
    assert.ok(response)
    assert.equal(response.status, 401)
  })

  test('GET/HEAD/OPTIONS de outra origem não são afetados', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const response = await callApi('/api/courses', method, {
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
      })
      assert.equal(passedThrough(response), true, method)
    }
  })

  test('login (callback GET) e logout (GET) seguem sem sessão', async () => {
    for (const path of ['/api/auth/callback/keycloak', '/api/auth/logout']) {
      const response = await middleware(
        new NextRequest(`${PORTAL}${path}`, {
          headers: { 'sec-fetch-site': 'cross-site' },
        })
      )
      assert.ok(response)
      assert.equal(passedThrough(response), true, path)
    }
  })

  test('refresh de mesma origem segue sem sessão válida', async () => {
    const response = await middleware(
      new NextRequest(`${PORTAL}/api/auth/refresh`, {
        method: 'POST',
        headers: { origin: PORTAL, 'sec-fetch-site': 'same-origin' },
      })
    )
    assert.ok(response)
    assert.equal(passedThrough(response), true)
  })
})

describe('checkCsrfOrigin', () => {
  const nextUrl = { host: 'admin.staging.app.dados.rio' }

  test('compara host com porta e sem diferenciar maiúsculas', () => {
    const verdict = (origin: string, host: string) =>
      checkCsrfOrigin({
        method: 'post',
        headers: new Headers({ origin, host }),
        nextUrl: { host },
      })
    assert.deepEqual(verdict('http://localhost:3000', 'localhost:3000'), {
      allowed: true,
    })
    assert.deepEqual(verdict('http://localhost:4000', 'localhost:3000'), {
      allowed: false,
      reason: 'cross-origin',
    })
    assert.deepEqual(
      verdict(
        'HTTPS://Admin.Staging.App.Dados.Rio',
        'admin.staging.app.dados.rio'
      ),
      { allowed: true }
    )
  })

  test('esquema que não é http(s) é origem inválida', () => {
    assert.deepEqual(
      checkCsrfOrigin({
        method: 'DELETE',
        headers: new Headers({ origin: 'file://admin.staging.app.dados.rio' }),
        nextUrl,
      }),
      { allowed: false, reason: 'invalid-origin' }
    )
  })

  test('X-Forwarded-Host em lista usa o primeiro valor', () => {
    assert.deepEqual(
      checkCsrfOrigin({
        method: 'PATCH',
        headers: new Headers({
          origin: 'https://evil.example',
          'x-forwarded-host': 'admin.staging.app.dados.rio, evil.example',
        }),
        nextUrl: { host: '10.0.0.7:3000' },
      }),
      { allowed: false, reason: 'cross-origin' }
    )
  })
})
