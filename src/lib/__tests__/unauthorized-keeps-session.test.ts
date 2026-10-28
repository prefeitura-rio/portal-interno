import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-67: cair em /unauthorized por falta de papel numa rota disparava, ao
// montar a página, o logout completo (Keycloak + gov.br), e o usuário perdia a
// sessão inteira, inclusive o acesso ao próprio módulo. A negação de uma rota
// precisa só comunicar o 403; o logout fica para a ação explícita (Sair) ou
// para o token expirado/inválido (/session-expired, renovação que falha).

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
const { middleware } = await import('../../middleware.ts')
const { resetHeimdallUserServerCache } = await import(
  '../heimdall-user-cache.ts'
)

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

/** JWT sintético com validade longa (como o do relato: ~24h restantes). */
function makeToken(sub: string, expOffsetSeconds = 86_000): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    })
  )
  return `${header}.${payload}.assinatura`
}

const rolesByToken = new Map<string, string[]>()
const originalFetch = globalThis.fetch
const originalWarn = console.warn

beforeEach(() => {
  resetHeimdallUserServerCache()
  rolesByToken.clear()
  console.warn = () => {}
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    assert.equal(url, 'https://heimdall.test/api/v1/users/me')
    const authorization = new Headers(init?.headers).get('authorization')
    const token = authorization?.replace(/^Bearer /, '') ?? ''
    const roles = rolesByToken.get(token)
    if (!roles) {
      return new Response('indisponível', { status: 503 })
    }
    return Response.json({ id: 1, roles })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

async function navigate(path: string, token: string): Promise<Response> {
  const request = new NextRequest(`http://localhost${path}`, {
    headers: {
      cookie: `access_token=${token}; refresh_token=refresh-${token}`,
    },
  })
  const response = await middleware(request)
  assert.ok(response, `middleware não respondeu para ${path}`)
  return response
}

/** O middleware deixou a navegação seguir para a página. */
function passedThrough(response: Response): boolean {
  return response.headers.get('x-middleware-next') === '1'
}

/** Cookies de sessão que a resposta apaga (Max-Age=0 ou valor vazio). */
function clearedSessionCookies(response: Response): string[] {
  return response.headers
    .getSetCookie()
    .filter(cookie =>
      /^(access_token|refresh_token|heimdall_user)=(;|\s*$)|max-age=0/i.test(
        cookie
      )
    )
}

describe('middleware: negação de rota por papel mantém a sessão (DEV-67)', () => {
  test('Editor — Cursos em /heimdall: 307 para /unauthorized sem apagar cookies', async () => {
    const token = makeToken('editor-cursos')
    rolesByToken.set(token, ['go:cursos:editor'])

    const denied = await navigate('/heimdall', token)
    assert.equal(denied.status, 307)
    assert.match(denied.headers.get('location') ?? '', /\/unauthorized$/)
    assert.deepEqual(clearedSessionCookies(denied), [])

    const unauthorizedPage = await navigate('/unauthorized', token)
    assert.equal(passedThrough(unauthorizedPage), true)
    assert.deepEqual(clearedSessionCookies(unauthorizedPage), [])

    // A mesma sessão continua valendo nas páginas do próprio módulo
    for (const path of ['/gorio/courses', '/']) {
      const allowed = await navigate(path, token)
      assert.equal(passedThrough(allowed), true, path)
      assert.deepEqual(clearedSessionCookies(allowed), [], path)
    }
  })
})

// O logout completo é client-side (fetch de /api/auth/logout + iframe do
// gov.br). Nenhum módulo montado em /unauthorized pode dispará-lo sozinho: só
// os pontos abaixo, que exigem ação explícita ou token expirado/inválido.
const LOGOUT_ALLOWED_MODULES: Record<string, string> = {
  'hooks/use-logout.ts': 'botão Sair (clique explícito)',
  'components/session-expired-handler.tsx': 'só em /session-expired',
  'hooks/use-token-refresh.ts': 'renovação do token falhou',
}

/** Chamada de logout: fetch ou navegação para /api/auth/logout. */
const LOGOUT_CALL =
  /(?:fetch\(|href\s*=|location\.(?:assign|replace)\()\s*['"`]\/api\/auth\/logout/

const LOCAL_IMPORT =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

function resolveLocalModule(specifier: string, parent: URL): URL | null {
  let base: URL
  if (specifier.startsWith('@/')) {
    base = new URL(specifier.slice(2), SRC_ROOT)
  } else if (specifier.startsWith('.')) {
    base = new URL(specifier, parent)
  } else {
    return null
  }
  for (const suffix of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = new URL(`${base.href}${suffix}`)
    if (/\.tsx?$/.test(candidate.pathname)) {
      if (existsSync(fileURLToPath(candidate))) {
        return candidate
      }
    }
  }
  return null
}

/** Módulos locais (src/) alcançáveis a partir das entradas, por import. */
function localModuleGraph(entries: URL[]): Map<string, string> {
  const sources = new Map<string, string>()
  const pending = [...entries]
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) break
    const relative = current.href.slice(SRC_ROOT.href.length)
    if (sources.has(relative)) continue
    const source = readFileSync(fileURLToPath(current), 'utf8')
    sources.set(relative, source)
    for (const match of source.matchAll(LOCAL_IMPORT)) {
      const specifier = match[1] ?? match[2]
      if (!specifier) continue
      const resolved = resolveLocalModule(specifier, current)
      if (resolved) pending.push(resolved)
    }
  }
  return sources
}

describe('/unauthorized não encerra a sessão ao montar (DEV-67)', () => {
  const entries = [
    new URL('app/(private)/layout.tsx', SRC_ROOT),
    new URL('app/(private)/unauthorized/page.tsx', SRC_ROOT),
  ]
  const graph = localModuleGraph(entries)

  test('o grafo inclui o layout privado e a página /unauthorized', () => {
    assert.ok(graph.has('app/(private)/layout.tsx'))
    assert.ok(graph.has('app/(private)/unauthorized/page.tsx'))
    assert.ok(graph.size > 2, 'o grafo precisa seguir os imports locais')
  })

  test('só módulos de logout explícito ou de token expirado chamam /api/auth/logout', () => {
    const offenders = [...graph.entries()]
      .filter(([, source]) => LOGOUT_CALL.test(source))
      .map(([path]) => path)
      .filter(path => !(path in LOGOUT_ALLOWED_MODULES))
    assert.deepEqual(offenders, [])
  })

  test('a página /unauthorized só sai da sessão por clique (useLogout)', () => {
    const page = graph.get('app/(private)/unauthorized/page.tsx') ?? ''
    assert.equal(page.includes('useEffect'), false)
    assert.match(page, /onClick=\{handleLogout\}/)
  })
})
