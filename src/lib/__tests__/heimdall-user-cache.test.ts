import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

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

const {
  HEIMDALL_USER_CACHE_MAX_ENTRIES,
  HEIMDALL_USER_CACHE_TTL_MS,
  getCachedHeimdallUser,
  resetHeimdallUserServerCache,
  resolveHeimdallUser,
  setCachedHeimdallUser,
} = await import('../heimdall-user-cache.ts')
const { getUserFromHeimdallWithCache } = await import(
  '../middleware-helpers.ts'
)
const { hasRouteAccess } = await import('../route-permissions.ts')
const { NextRequest, NextResponse } = await import('next/server.js')

// Identificadores sintéticos (sem titular real)
const CPF_A = '52998224725'
const CPF_B = '11144477735'
const HEIMDALL_BASE_URL = 'https://heimdall.invalid/'
const PROTECTED_PATH = '/gorio/empregabilidade'

type FakeUser = {
  id: number
  cpf: string
  display_name?: string
  groups?: string[]
  roles?: string[]
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.assinatura`
}

function tokenFor(sub: string, expInSeconds = 600): string {
  return makeToken({
    sub,
    exp: Math.floor(Date.now() / 1000) + expInSeconds,
  })
}

const userA: FakeUser = { id: 1, cpf: CPF_A, roles: [] }
const userB: FakeUser = {
  id: 2,
  cpf: CPF_B,
  roles: ['go:empregabilidade:admin'],
}

const originalFetch = globalThis.fetch
const originalBaseUrl = process.env.HEIMDALL_BASE_API_URL
let heimdallCalls: string[]
let heimdallUsersByToken: Map<string, FakeUser>
let heimdallDown: boolean

function makeRequest(
  cookies: Record<string, string>
): InstanceType<typeof NextRequest> {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')
  return new NextRequest(`https://admin.invalid${PROTECTED_PATH}`, {
    headers: { cookie: cookieHeader },
  })
}

beforeEach(() => {
  resetHeimdallUserServerCache()
  heimdallCalls = []
  heimdallUsersByToken = new Map()
  heimdallDown = false
  process.env.HEIMDALL_BASE_API_URL = HEIMDALL_BASE_URL
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const url = input instanceof Request ? input.url : String(input)
    assert.equal(url, `${HEIMDALL_BASE_URL}api/v1/users/me`)
    const auth = new Headers(init?.headers).get('Authorization') ?? ''
    const token = auth.replace(/^Bearer /, '')
    heimdallCalls.push(token)
    if (heimdallDown) {
      throw new TypeError('fetch failed')
    }
    const user = heimdallUsersByToken.get(token)
    if (!user) {
      return new Response('{"detail":"invalid token"}', { status: 401 })
    }
    return Response.json(user)
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalBaseUrl === undefined) {
    process.env.HEIMDALL_BASE_API_URL = undefined
    Reflect.deleteProperty(process.env, 'HEIMDALL_BASE_API_URL')
  } else {
    process.env.HEIMDALL_BASE_API_URL = originalBaseUrl
  }
})

describe('middleware: getUserFromHeimdallWithCache', () => {
  test('cookie heimdall_user forjado é ignorado e os papéis vêm do Heimdall', async () => {
    const token = tokenFor(CPF_A)
    heimdallUsersByToken.set(token, userA)
    const forged = JSON.stringify({
      id: 1,
      cpf: CPF_A,
      roles: ['admin', 'superadmin', 'go:empregabilidade:admin'],
    })
    const request = makeRequest({ access_token: token, heimdall_user: forged })
    const response = NextResponse.next()

    const user = await getUserFromHeimdallWithCache(request, response, token)

    assert.deepEqual(user?.roles, [])
    assert.deepEqual(heimdallCalls, [token])
    assert.equal(hasRouteAccess(PROTECTED_PATH, user?.roles ?? null), false)
  })

  test('cookie heimdall_user de outro usuário é ignorado', async () => {
    const token = tokenFor(CPF_A)
    heimdallUsersByToken.set(token, userA)
    const request = makeRequest({
      access_token: token,
      heimdall_user: JSON.stringify(userB),
    })

    const user = await getUserFromHeimdallWithCache(
      request,
      NextResponse.next(),
      token
    )

    assert.equal(user?.id, userA.id)
    assert.equal(user?.cpf, CPF_A)
    assert.deepEqual(user?.roles, [])
  })

  test('apaga o cookie legado e nunca grava um novo', async () => {
    const token = tokenFor(CPF_A)
    heimdallUsersByToken.set(token, userA)
    const response = NextResponse.next()

    await getUserFromHeimdallWithCache(
      makeRequest({
        access_token: token,
        heimdall_user: '{"roles":["admin"]}',
      }),
      response,
      token
    )

    const cookie = response.cookies.get('heimdall_user')
    assert.equal(cookie?.value, '')
    assert.equal(cookie?.maxAge, 0)

    const cleanResponse = NextResponse.next()
    await getUserFromHeimdallWithCache(
      makeRequest({ access_token: token }),
      cleanResponse,
      token
    )
    assert.equal(cleanResponse.cookies.get('heimdall_user'), undefined)
  })

  test('papéis legítimos do Heimdall continuam liberando a rota', async () => {
    const token = tokenFor(CPF_B)
    heimdallUsersByToken.set(token, userB)

    const user = await getUserFromHeimdallWithCache(
      makeRequest({ access_token: token }),
      NextResponse.next(),
      token
    )

    assert.equal(hasRouteAccess(PROTECTED_PATH, user?.roles ?? null), true)
  })

  test('cache do servidor evita nova chamada para o mesmo token', async () => {
    const token = tokenFor(CPF_B)
    heimdallUsersByToken.set(token, userB)

    for (let i = 0; i < 3; i++) {
      await getUserFromHeimdallWithCache(
        makeRequest({ access_token: token }),
        NextResponse.next(),
        token
      )
    }

    assert.deepEqual(heimdallCalls, [token])
  })

  test('token de outro usuário não reaproveita o cache', async () => {
    const tokenB = tokenFor(CPF_B)
    const tokenA = tokenFor(CPF_A)
    heimdallUsersByToken.set(tokenB, userB)
    heimdallUsersByToken.set(tokenA, userA)

    await getUserFromHeimdallWithCache(
      makeRequest({ access_token: tokenB }),
      NextResponse.next(),
      tokenB
    )
    const userFromA = await getUserFromHeimdallWithCache(
      makeRequest({ access_token: tokenA }),
      NextResponse.next(),
      tokenA
    )

    assert.deepEqual(userFromA?.roles, [])
    assert.deepEqual(heimdallCalls, [tokenB, tokenA])
  })

  test('token forjado (mesmo sub, assinatura diferente) não usa o cache do legítimo', async () => {
    const legit = tokenFor(CPF_B)
    heimdallUsersByToken.set(legit, userB)
    await getUserFromHeimdallWithCache(
      makeRequest({ access_token: legit }),
      NextResponse.next(),
      legit
    )

    const forgedToken = `${legit.slice(0, legit.lastIndexOf('.'))}.outra`
    const user = await getUserFromHeimdallWithCache(
      makeRequest({
        access_token: forgedToken,
        heimdall_user: JSON.stringify(userB),
      }),
      NextResponse.next(),
      forgedToken
    )

    assert.equal(user, null)
    assert.equal(hasRouteAccess(PROTECTED_PATH, null), false)
  })

  test('Heimdall indisponível: sem papéis, mesmo com cookie heimdall_user', async () => {
    const token = tokenFor(CPF_A)
    heimdallDown = true

    const user = await getUserFromHeimdallWithCache(
      makeRequest({
        access_token: token,
        heimdall_user: JSON.stringify(userB),
      }),
      NextResponse.next(),
      token
    )

    assert.equal(user, null)
    assert.equal(hasRouteAccess(PROTECTED_PATH, null), false)
  })

  test('falha do Heimdall não é guardada no cache', async () => {
    const token = tokenFor(CPF_B)
    heimdallDown = true
    await getUserFromHeimdallWithCache(
      makeRequest({ access_token: token }),
      NextResponse.next(),
      token
    )

    heimdallDown = false
    heimdallUsersByToken.set(token, userB)
    const user = await getUserFromHeimdallWithCache(
      makeRequest({ access_token: token }),
      NextResponse.next(),
      token
    )

    assert.deepEqual(user?.roles, userB.roles)
    assert.equal(heimdallCalls.length, 2)
  })
})

describe('heimdall-user-cache', () => {
  test('entrada expira após o TTL', async () => {
    const token = tokenFor(CPF_B, 3600)
    const now = Date.now()
    await setCachedHeimdallUser(token, userB, now)

    assert.ok(await getCachedHeimdallUser(token, now + 1000))
    assert.equal(
      await getCachedHeimdallUser(token, now + HEIMDALL_USER_CACHE_TTL_MS),
      null
    )
  })

  test('entrada não passa do exp do token', async () => {
    const now = Date.now()
    const token = makeToken({ sub: CPF_B, exp: Math.floor(now / 1000) + 30 })
    await setCachedHeimdallUser(token, userB, now)

    assert.ok(await getCachedHeimdallUser(token, now + 10_000))
    assert.equal(await getCachedHeimdallUser(token, now + 31_000), null)
  })

  test('token expirado não entra no cache', async () => {
    const token = tokenFor(CPF_B, -10)
    await setCachedHeimdallUser(token, userB)

    assert.equal(await getCachedHeimdallUser(token), null)
  })

  test('alterar o objeto devolvido não altera o cache', async () => {
    const token = tokenFor(CPF_A)
    await setCachedHeimdallUser(token, userA)

    const first = await getCachedHeimdallUser(token)
    first?.roles?.push('admin')

    const second = await getCachedHeimdallUser(token)
    assert.deepEqual(second?.roles, [])
  })

  test('tamanho limitado: descarta a entrada mais antiga', async () => {
    const tokens = Array.from(
      { length: HEIMDALL_USER_CACHE_MAX_ENTRIES + 1 },
      (_, i) => tokenFor(`sub-${i}`)
    )
    for (const token of tokens) {
      await setCachedHeimdallUser(token, userA)
    }

    assert.equal(await getCachedHeimdallUser(tokens[0]), null)
    assert.ok(await getCachedHeimdallUser(tokens[tokens.length - 1]))
  })

  test('resolveHeimdallUser sem token válido no Heimdall devolve null', async () => {
    const user = await resolveHeimdallUser(tokenFor(CPF_A), async () => null)
    assert.equal(user, null)
  })
})
