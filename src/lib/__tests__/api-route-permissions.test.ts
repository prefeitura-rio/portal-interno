import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-43: o middleware excluía /api do RBAC e nenhum handler conferia o papel,
// então qualquer login chamava direto as rotas de dado pessoal e de
// administração. Aqui o middleware real é exercitado com NextRequest.

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

process.env.HEIMDALL_BASE_API_URL = 'https://heimdall.test/'

const { NextRequest } = await import('next/server')
const { middleware, config } = await import('../../middleware.ts')
const { resetHeimdallUserServerCache } = await import(
  '../heimdall-user-cache.ts'
)
const { API_ROUTE_PERMISSIONS, findApiRoutePermission, hasApiRouteAccess } =
  await import('../route-permissions.ts')
const { canApproveCourses, canPublishCourses, isBuscaServicesAdmin } =
  await import('../../types/heimdall-roles.ts')

// CPF sintético (dígitos verificadores válidos, sem titular real)
const CPF = '52998224725'

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

/** JWT sintético; `sub` distingue os usuários (e as entradas do cache). */
function makeToken(sub: string, expOffsetSeconds = 600): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    })
  )
  return `${header}.${payload}.assinatura`
}

/** Papéis que o Heimdall falso devolve em /users/me, por token. */
const rolesByToken = new Map<string, string[] | 'erro'>()
let heimdallCalls = 0

const originalFetch = globalThis.fetch
const originalWarn = console.warn
const originalError = console.error
let logLines: string[] = []

beforeEach(() => {
  resetHeimdallUserServerCache()
  rolesByToken.clear()
  heimdallCalls = 0
  logLines = []
  const capture = (...args: unknown[]) => {
    logLines.push(args.map(arg => String(arg)).join(' '))
  }
  console.warn = capture
  console.error = capture
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    assert.equal(url, 'https://heimdall.test/api/v1/users/me')
    heimdallCalls++
    const authorization = new Headers(init?.headers).get('authorization')
    const token = authorization?.replace(/^Bearer /, '') ?? ''
    const roles = rolesByToken.get(token)
    if (!roles || roles === 'erro') {
      return new Response('indisponível', { status: 503 })
    }
    return Response.json({ id: 1, cpf: CPF, roles })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
  console.error = originalError
})

function userWith(roles: string[] | 'erro', sub = roles.toString()): string {
  const token = makeToken(`u-${sub}`)
  rolesByToken.set(token, roles)
  return token
}

async function callApi(
  path: string,
  token?: string,
  method = 'GET'
): Promise<Response> {
  const headers = new Headers()
  if (token) {
    headers.set('cookie', `access_token=${token}`)
  }
  const request = new NextRequest(`http://localhost${path}`, {
    method,
    headers,
  })
  const response = await middleware(request)
  assert.ok(response, `middleware não respondeu para ${path}`)
  return response
}

/** O middleware deixou a requisição seguir para o handler da rota. */
function passedThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

async function assertDenied(
  response: Response,
  status: 401 | 403
): Promise<void> {
  assert.equal(response.status, status)
  assert.equal(passedThrough(response), false)
  assert.equal(response.headers.get('location'), null, 'API não redireciona')
  const body = (await response.json()) as { error?: unknown }
  assert.equal(typeof body.error, 'string')
}

describe('middleware: RBAC das rotas de API (DEV-43)', () => {
  test('o matcher passa a incluir /api', () => {
    assert.ok(
      (config.matcher as unknown[]).includes('/api/:path*'),
      'config.matcher precisa casar /api/:path*'
    )
  })

  test('banco de currículos: login sem go:curriculos:* recebe 403', async () => {
    const token = userWith(['go:cursos:editor'])
    for (const path of [
      '/api/empregabilidade/banco-curriculos',
      `/api/empregabilidade/banco-curriculos/${CPF}`,
      `/api/empregabilidade/banco-curriculos/${CPF}/candidaturas`,
    ]) {
      await assertDenied(await callApi(path, token), 403)
    }
  })

  test('banco de currículos: papel do módulo segue para o handler', async () => {
    for (const roles of [['go:curriculos:editor'], ['go:admin'], ['admin']]) {
      const token = userWith(roles)
      const response = await callApi(
        `/api/empregabilidade/banco-curriculos/${CPF}`,
        token
      )
      assert.equal(passedThrough(response), true, roles.join(','))
    }
  })

  test('associar candidato exige currículos e Emprego e trabalho', async () => {
    const path = `/api/empregabilidade/banco-curriculos/${CPF}/associacoes`
    await assertDenied(
      await callApi(path, userWith(['go:curriculos:editor']), 'POST'),
      403
    )
    await assertDenied(
      await callApi(path, userWith(['go:empregabilidade:admin']), 'POST'),
      403
    )
    const both = userWith(['go:curriculos:admin', 'go:empregabilidade:admin'])
    assert.equal(passedThrough(await callApi(path, both, 'POST')), true)
    assert.equal(
      passedThrough(await callApi(path, userWith(['superadmin']), 'POST')),
      true
    )
  })

  test('Heimdall admin: go:admin e papéis de módulo recebem 403', async () => {
    const paths = [
      '/api/heimdall/grupos',
      '/api/heimdall/papeis',
      `/api/heimdall/usuarios/${CPF}`,
      `/api/heimdall/grupos/time/membros/${CPF}`,
      '/api/heimdall/mapeamentos/resolver',
    ]
    for (const roles of [
      ['go:admin'],
      ['go:curriculos:admin'],
      ['busca:services:admin'],
    ]) {
      const token = userWith(roles)
      for (const path of paths) {
        await assertDenied(await callApi(path, token, 'DELETE'), 403)
      }
    }
    const admin = userWith(['admin'])
    for (const path of paths) {
      assert.equal(passedThrough(await callApi(path, admin, 'DELETE')), true)
    }
  })

  test('vínculos CPF-secretaria: só admin/superadmin', async () => {
    const path = `/api/admin/cpf-secretaria/${CPF}/1234`
    await assertDenied(
      await callApi(path, userWith(['go:admin']), 'DELETE'),
      403
    )
    assert.equal(
      passedThrough(await callApi(path, userWith(['superadmin']), 'DELETE')),
      true
    )
  })

  test('cada módulo nega quem só tem papel de outro módulo', async () => {
    const cases: [string, string[], string[]][] = [
      [
        '/api/empregabilidade/candidaturas',
        ['go:cursos:editor'],
        ['go:empregabilidade:editor_com_curadoria'],
      ],
      [
        '/api/empregabilidade/vagas/42/publish',
        ['go:curriculos:admin'],
        ['go:empregabilidade:admin'],
      ],
      [
        '/api/courses/7/approve',
        ['go:empregabilidade:admin'],
        ['go:cursos:casa_civil'],
      ],
      ['/api/enrollments/7', ['busca:services:editor'], ['go:cursos:editor']],
      ['/api/services/abc/publish', ['go:admin'], ['busca:services:admin']],
      ['/api/oportunidades-mei/3', ['go:empregabilidade:admin'], ['go:admin']],
    ]
    for (const [path, denied, allowed] of cases) {
      await assertDenied(await callApi(path, userWith(denied), 'POST'), 403)
      assert.equal(
        passedThrough(await callApi(path, userWith(allowed), 'POST')),
        true,
        `${path} com ${allowed.join(',')}`
      )
    }
  })

  test('sem sessão: 401 em JSON, sem redirecionar nem chamar o Heimdall', async () => {
    await assertDenied(await callApi('/api/heimdall/grupos'), 401)
    await assertDenied(
      await callApi(`/api/empregabilidade/banco-curriculos/${CPF}`),
      401
    )
    assert.equal(heimdallCalls, 0)
  })

  test('token expirado: 401', async () => {
    const expired = makeToken('u-expirado', -60)
    rolesByToken.set(expired, ['admin'])
    await assertDenied(await callApi('/api/heimdall/grupos', expired), 401)
    assert.equal(heimdallCalls, 0)
  })

  test('Heimdall indisponível ou usuário sem papel: 403 (falha fechada)', async () => {
    await assertDenied(
      await callApi('/api/empregabilidade/vagas', userWith('erro', 'erro')),
      403
    )
    await assertDenied(
      await callApi('/api/empregabilidade/vagas', userWith([], 'vazio')),
      403
    )
  })

  test('rota de API sem regra é negada mesmo para admin', async () => {
    const admin = userWith(['admin'])
    await assertDenied(await callApi('/api/rota-nova-sem-regra', admin), 403)
    await assertDenied(await callApi('/api', admin), 403)
    await assertDenied(
      await callApi('/api/heimdall/grupos/a/b/c/d', admin),
      403
    )
  })

  test('rotas públicas seguem sem sessão', async () => {
    for (const path of [
      '/api/health',
      '/api/auth/callback/keycloak',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/token-status',
    ]) {
      assert.equal(passedThrough(await callApi(path)), true, path)
    }
    assert.equal(heimdallCalls, 0)
  })

  test('dados do próprio usuário exigem só a sessão', async () => {
    const semPapel = userWith([], 'sem-papel')
    for (const path of ['/api/heimdall/user', '/api/me/secretarias']) {
      assert.equal(passedThrough(await callApi(path, semPapel)), true, path)
      await assertDenied(await callApi(path), 401)
    }
  })

  test('catálogos sem dado pessoal valem para qualquer papel do backoffice', async () => {
    const token = userWith(['go:curriculos:editor'])
    for (const path of [
      '/api/departments',
      '/api/departments/1234',
      '/api/empregabilidade/idiomas',
      '/api/empregabilidade/regimes-contratacao',
    ]) {
      assert.equal(passedThrough(await callApi(path, token)), true, path)
    }
    await assertDenied(
      await callApi('/api/departments', userWith([], 'x')),
      403
    )
  })

  test('logs da negação não levam o CPF do caminho nem os papéis', async () => {
    await callApi(
      `/api/empregabilidade/banco-curriculos/${CPF}`,
      userWith(['go:cursos:editor'])
    )
    await callApi(`/api/inexistente/${CPF}`, userWith(['admin']))
    assert.ok(logLines.length >= 2)
    for (const line of logLines) {
      assert.ok(!line.includes(CPF), `log com CPF: ${line}`)
      assert.ok(!line.includes('go:cursos:editor'), `log com papel: ${line}`)
    }
  })

  test('páginas continuam com o RBAC de ROUTE_PERMISSIONS', async () => {
    const token = userWith(['go:cursos:editor'])
    const request = new NextRequest('http://localhost/heimdall', {
      headers: { cookie: `access_token=${token}` },
    })
    const response = await middleware(request)
    assert.ok(response)
    assert.equal(response.status, 307)
    assert.match(response.headers.get('location') ?? '', /\/unauthorized$/)
  })
})

describe('Dashboard de Capacitações: só Casa Civil e admins (DEV-100)', () => {
  const PAGE = '/gorio/courses/dashboard'
  const API = '/api/courses/dashboard'
  const ALLOWED = [['go:cursos:casa_civil'], ['admin'], ['superadmin']]
  const DENIED = [
    ['go:admin'],
    ['go:cursos:editor'],
    ['busca:services:admin'],
    ['go:empregabilidade:admin'],
    ['go:curriculos:admin'],
  ]

  async function callPage(token: string): Promise<Response> {
    const request = new NextRequest(`http://localhost${PAGE}`, {
      headers: { cookie: `access_token=${token}` },
    })
    const response = await middleware(request)
    assert.ok(response)
    return response
  }

  test('Casa Civil, admin (heimdall_admins) e superadmin acessam a página e a API', async () => {
    for (const roles of ALLOWED) {
      const token = userWith(roles)
      assert.equal(passedThrough(await callPage(token)), true, roles.join())
      assert.equal(passedThrough(await callApi(API, token)), true, roles.join())
    }
  })

  test('outros papéis vão para /unauthorized na página e recebem 403 na API', async () => {
    for (const roles of DENIED) {
      const token = userWith(roles)
      const page = await callPage(token)
      assert.equal(page.status, 307, roles.join())
      assert.match(page.headers.get('location') ?? '', /\/unauthorized$/)
      await assertDenied(await callApi(API, token), 403)
    }
  })

  test('o editor de cursos segue com acesso à listagem de cursos', async () => {
    const token = userWith(['go:cursos:editor'])
    assert.equal(passedThrough(await callApi('/api/courses', token)), true)
  })

  test('sem sessão: 401; sem papel ou Heimdall fora: 403', async () => {
    await assertDenied(await callApi(API), 401)
    await assertDenied(await callApi(API, userWith([], 'sem-papel')), 403)
    await assertDenied(await callApi(API, userWith('erro')), 403)
  })

  test('a regra da rota literal vence a de /api/courses/[course-id]', () => {
    assert.equal(findApiRoutePermission(API)?.pattern, API)
  })
})

// DEV-125: a UI só mostra Aprovar/Publicar (cursos) à Casa Civil e
// Publicar/Despublicar/Enviar para edição/Reverter (serviços) ao admin do
// módulo, mas as rotas aceitavam qualquer papel do módulo, inclusive o Editor.
describe('aprovar e publicar exigem o papel que a UI exige (DEV-125)', () => {
  const COURSE_CURATION_ROUTES: [string, string][] = [
    ['/api/courses/7/approve', 'PUT'],
    ['/api/courses/7/publish', 'PUT'],
    ['/api/courses/7/publish-directly', 'PUT'],
    ['/api/courses/publish-directly', 'POST'],
  ]
  const SERVICE_ADMIN_ROUTES: [string, string][] = [
    ['/api/services/abc/publish', 'PATCH'],
    ['/api/services/abc/unpublish', 'PATCH'],
    ['/api/services/abc/send-to-edition', 'PATCH'],
    ['/api/services/abc/rollback', 'POST'],
    ['/api/tombamentos/xyz', 'DELETE'],
  ]

  test('cursos: Editor recebe 403 ao aprovar ou publicar', async () => {
    const editor = userWith(['go:cursos:editor'])
    for (const [path, method] of COURSE_CURATION_ROUTES) {
      await assertDenied(await callApi(path, editor, method), 403)
    }
  })

  test('cursos: Casa Civil, go:admin, admin e superadmin seguem para o handler', async () => {
    for (const roles of [
      ['go:cursos:casa_civil'],
      ['go:admin'],
      ['admin'],
      ['superadmin'],
      ['go:cursos:editor', 'go:cursos:casa_civil'],
    ]) {
      const token = userWith(roles)
      for (const [path, method] of COURSE_CURATION_ROUTES) {
        assert.equal(
          passedThrough(await callApi(path, token, method)),
          true,
          `${method} ${path} com ${roles.join(',')}`
        )
      }
    }
  })

  test('cursos: o Editor segue com criar, editar, enviar e propor edição/exclusão', async () => {
    const editor = userWith(['go:cursos:editor'])
    for (const [path, method] of [
      ['/api/courses', 'GET'],
      ['/api/courses/new', 'POST'],
      ['/api/courses/draft', 'POST'],
      ['/api/courses/send-to-review', 'POST'],
      ['/api/courses/7', 'PUT'],
      ['/api/courses/7/send-to-review', 'PUT'],
      ['/api/courses/7/request-changes', 'PUT'],
      ['/api/courses/7/request-deletion', 'PUT'],
      ['/api/enrollments/7', 'GET'],
    ]) {
      assert.equal(
        passedThrough(await callApi(path, editor, method)),
        true,
        `${method} ${path}`
      )
    }
  })

  test('serviços: Editor recebe 403 ao publicar, despublicar, devolver ou reverter', async () => {
    const editor = userWith(['busca:services:editor'])
    for (const [path, method] of SERVICE_ADMIN_ROUTES) {
      await assertDenied(await callApi(path, editor, method), 403)
    }
  })

  test('serviços: busca:services:admin, admin e superadmin seguem para o handler', async () => {
    for (const roles of [
      ['busca:services:admin'],
      ['admin'],
      ['superadmin'],
      ['busca:services:editor', 'busca:services:admin'],
    ]) {
      const token = userWith(roles)
      for (const [path, method] of SERVICE_ADMIN_ROUTES) {
        assert.equal(
          passedThrough(await callApi(path, token, method)),
          true,
          `${method} ${path} com ${roles.join(',')}`
        )
      }
    }
  })

  test('serviços: o Editor segue com listar, editar, enviar para aprovação e ver versões', async () => {
    const editor = userWith(['busca:services:editor'])
    for (const [path, method] of [
      ['/api/services', 'GET'],
      ['/api/services', 'POST'],
      ['/api/services/abc', 'PUT'],
      ['/api/services/abc/send-to-approval', 'PATCH'],
      ['/api/services/abc/versions', 'GET'],
      ['/api/services/abc/versions/compare', 'GET'],
      ['/api/tombamentos', 'GET'],
      ['/api/tombamentos/by-old-service', 'GET'],
    ]) {
      assert.equal(
        passedThrough(await callApi(path, editor, method)),
        true,
        `${method} ${path}`
      )
    }
  })

  test('papéis de outro módulo e go:admin (serviços) recebem 403', async () => {
    for (const roles of [
      ['go:empregabilidade:admin'],
      ['busca:services:admin'],
    ]) {
      const token = userWith(roles)
      for (const [path, method] of COURSE_CURATION_ROUTES) {
        await assertDenied(await callApi(path, token, method), 403)
      }
    }
    for (const roles of [['go:admin'], ['go:cursos:casa_civil']]) {
      const token = userWith(roles)
      for (const [path, method] of SERVICE_ADMIN_ROUTES) {
        await assertDenied(await callApi(path, token, method), 403)
      }
    }
  })

  test('sem sessão: 401; sem papel ou Heimdall fora: 403', async () => {
    for (const [path, method] of [
      ...COURSE_CURATION_ROUTES,
      ...SERVICE_ADMIN_ROUTES,
    ]) {
      await assertDenied(await callApi(path, undefined, method), 401)
      await assertDenied(
        await callApi(path, userWith([], 'sem-papel'), method),
        403
      )
      await assertDenied(await callApi(path, userWith('erro'), method), 403)
    }
  })

  test('a regra de cada rota é a mesma lista que mostra o botão na UI', () => {
    const allRoles = [
      'admin',
      'superadmin',
      'go:admin',
      'go:cursos:casa_civil',
      'go:cursos:editor',
      'busca:services:admin',
      'busca:services:editor',
      'go:empregabilidade:admin',
      'go:empregabilidade:editor_sem_curadoria',
      'go:empregabilidade:editor_com_curadoria',
      'go:curriculos:admin',
      'go:curriculos:editor',
    ]
    for (const [path] of COURSE_CURATION_ROUTES) {
      const rule = findApiRoutePermission(path)
      assert.ok(rule, path)
      for (const role of allRoles) {
        const roles = [role]
        assert.equal(
          hasApiRouteAccess(rule.permission, roles),
          canApproveCourses(roles) && canPublishCourses(roles),
          `${path} com ${role}`
        )
      }
    }
    for (const [path] of SERVICE_ADMIN_ROUTES) {
      const rule = findApiRoutePermission(path)
      assert.ok(rule, path)
      for (const role of allRoles) {
        assert.equal(
          hasApiRouteAccess(rule.permission, [role]),
          isBuscaServicesAdmin([role]),
          `${path} com ${role}`
        )
      }
    }
  })
})

describe('API_ROUTE_PERMISSIONS', () => {
  const API_ROOT = new URL('../../app/api/', import.meta.url)

  function listApiRoutes(dir: URL, prefix = '/api'): string[] {
    const routes: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== '__tests__') {
        routes.push(
          ...listApiRoutes(
            new URL(`${entry.name}/`, dir),
            `${prefix}/${entry.name}`
          )
        )
      } else if (entry.isFile() && /^route\.[jt]sx?$/.test(entry.name)) {
        routes.push(prefix)
      }
    }
    return routes
  }

  const routes = listApiRoutes(API_ROOT)

  test('toda rota de src/app/api tem regra própria', () => {
    assert.ok(routes.length > 50)
    const missing = routes.filter(route => !(route in API_ROUTE_PERMISSIONS))
    assert.deepEqual(missing, [])
  })

  test('nenhuma regra aponta para rota que não existe', () => {
    const stale = Object.keys(API_ROUTE_PERMISSIONS).filter(
      pattern => !routes.includes(pattern)
    )
    assert.deepEqual(stale, [])
  })

  test('cada rota resolve para a própria regra', () => {
    for (const route of routes) {
      const concrete = route.replace(/\[[^\]]+\]/g, 'valor')
      assert.equal(findApiRoutePermission(concrete)?.pattern, route, route)
    }
  })

  test('segmento literal tem precedência sobre dinâmico', () => {
    assert.equal(
      findApiRoutePermission('/api/courses/draft')?.pattern,
      '/api/courses/draft'
    )
    assert.equal(
      findApiRoutePermission('/api/courses/123')?.pattern,
      '/api/courses/[course-id]'
    )
    assert.equal(
      findApiRoutePermission('/api/empregabilidade/vagas/new')?.pattern,
      '/api/empregabilidade/vagas/new'
    )
    assert.equal(
      findApiRoutePermission('/api/heimdall/mapeamentos/resolver')?.pattern,
      '/api/heimdall/mapeamentos/resolver'
    )
  })

  test('só auth e health são públicas', () => {
    const publicRoutes = Object.entries(API_ROUTE_PERMISSIONS)
      .filter(([, permission]) => permission.kind === 'public')
      .map(([pattern]) => pattern)
      .sort()
    assert.deepEqual(publicRoutes, [
      '/api/auth/callback/keycloak',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/token-status',
      '/api/health',
    ])
  })

  test('rotas com CPF ou administração nunca valem para qualquer login', () => {
    for (const [pattern, permission] of Object.entries(API_ROUTE_PERMISSIONS)) {
      if (
        /\[cpf\]|banco-curriculos|candidaturas|candidatos|enrollments|heimdall\/(?!user$)|\/admin\//.test(
          pattern
        )
      ) {
        assert.equal(permission.kind, 'roles', pattern)
      }
    }
  })

  test('hasApiRouteAccess sem papéis só libera public/authenticated', () => {
    assert.equal(hasApiRouteAccess({ kind: 'public' }, null), true)
    assert.equal(hasApiRouteAccess({ kind: 'authenticated' }, undefined), true)
    const rule = { kind: 'roles', anyOfEach: [['admin']] } as const
    assert.equal(hasApiRouteAccess(rule, null), false)
    assert.equal(hasApiRouteAccess(rule, []), false)
    assert.equal(hasApiRouteAccess(rule, ['admin']), true)
  })
})
