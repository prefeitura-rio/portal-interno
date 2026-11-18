import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-644: com a flag de runtime FEATURE_COURSES_DASHBOARD desligada, o
// middleware responde 404 a /gorio/courses/dashboard para todos os papéis,
// depois do RBAC (quem não tem o papel continua indo para /unauthorized). O
// middleware real é chamado com o Heimdall substituído por um fetch sintético.

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
const { isPageDisabledByFeatureFlag } = await import('../feature-flags.ts')
const { resetHeimdallUserServerCache } = await import(
  '../heimdall-user-cache.ts'
)

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(sub: string): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })
  )
  return `${header}.${payload}.assinatura`
}

const rolesByToken = new Map<string, string[]>()
const originalFetch = globalThis.fetch
const originalWarn = console.warn
const ORIGINAL_FLAG = process.env.FEATURE_COURSES_DASHBOARD

function setFlag(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'FEATURE_COURSES_DASHBOARD')
  } else {
    process.env.FEATURE_COURSES_DASHBOARD = value
  }
}

beforeEach(() => {
  resetHeimdallUserServerCache()
  rolesByToken.clear()
  console.warn = () => {}
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const authorization = new Headers(init?.headers).get('authorization')
    const roles = rolesByToken.get(authorization?.replace(/^Bearer /, '') ?? '')
    if (!roles) {
      return new Response('indisponível', { status: 503 })
    }
    return Response.json({ id: 1, roles })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
  setFlag(ORIGINAL_FLAG)
})

async function navigate(path: string, roles: string[]): Promise<Response> {
  const token = makeToken(`usuario-${roles.join('-')}`)
  rolesByToken.set(token, roles)
  const request = new NextRequest(`http://localhost${path}`, {
    headers: { cookie: `access_token=${token}` },
  })
  const response = await middleware(request)
  assert.ok(response, `middleware não respondeu para ${path}`)
  return response
}

function passedThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

const DASHBOARD_ROLES = ['admin', 'superadmin', 'go:cursos:casa_civil']

describe('middleware: Dashboard de Capacitações atrás da flag (DEV-644)', () => {
  for (const value of [undefined, 'false', 'TRUE']) {
    test(`flag ${JSON.stringify(value ?? null)}: 404 para os papéis da rota, inclusive admins`, async () => {
      setFlag(value)
      for (const role of DASHBOARD_ROLES) {
        const response = await navigate('/gorio/courses/dashboard', [role])
        assert.equal(response.status, 404, role)
        assert.equal(passedThrough(response), false, role)
        assert.match(await response.text(), /Página não encontrada/, role)
      }
    })
  }

  test('flag desligada: sem o papel, segue o RBAC (307 para /unauthorized)', async () => {
    setFlag('false')
    for (const role of ['go:cursos:editor', 'go:admin']) {
      const response = await navigate('/gorio/courses/dashboard', [role])
      assert.equal(response.status, 307, role)
      assert.match(response.headers.get('location') ?? '', /\/unauthorized$/)
    }
  })

  test('flag desligada: as demais telas de Capacitação seguem abertas', async () => {
    setFlag('false')
    for (const path of ['/gorio/courses', '/gorio/courses/new']) {
      for (const role of [
        'admin',
        'go:cursos:casa_civil',
        'go:cursos:editor',
      ]) {
        assert.equal(passedThrough(await navigate(path, [role])), true, path)
      }
    }
  })

  test('flag "true": a página volta como hoje, só para os papéis da rota', async () => {
    setFlag('true')
    for (const role of DASHBOARD_ROLES) {
      const response = await navigate('/gorio/courses/dashboard', [role])
      assert.equal(passedThrough(response), true, role)
    }
    const denied = await navigate('/gorio/courses/dashboard', [
      'go:cursos:editor',
    ])
    assert.equal(denied.status, 307)
  })

  test('isPageDisabledByFeatureFlag casa só a rota da Dashboard e as subrotas', () => {
    setFlag('false')
    assert.equal(isPageDisabledByFeatureFlag('/gorio/courses/dashboard'), true)
    assert.equal(
      isPageDisabledByFeatureFlag('/gorio/courses/dashboard/qualquer'),
      true
    )
    for (const path of [
      '/gorio/courses',
      '/gorio/courses/new',
      '/gorio/courses/dashboards',
      '/',
      '/heimdall',
    ]) {
      assert.equal(isPageDisabledByFeatureFlag(path), false, path)
    }
    setFlag('true')
    assert.equal(isPageDisabledByFeatureFlag('/gorio/courses/dashboard'), false)
  })
})
