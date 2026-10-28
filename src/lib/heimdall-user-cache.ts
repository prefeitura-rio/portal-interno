import type { HeimdallUser } from '@/types/heimdall-roles'

/**
 * Cache do usuário do Heimdall (`GET /users/me`: id, CPF, grupos e papéis)
 * mantido só na memória do servidor.
 *
 * Substitui o antigo cookie `heimdall_user`, que vinha do cliente sem
 * assinatura e era usado na autorização: qualquer pessoa com sessão válida
 * podia montar o cookie com papéis que não tem. Aqui a chave é o SHA-256 do
 * próprio `access_token` (o mesmo token que o Heimdall validou ao responder),
 * então um token diferente, forjado ou de outro usuário, nunca reaproveita a
 * entrada de outra sessão. A entrada vale no máximo
 * `HEIMDALL_USER_CACHE_TTL_MS` e nunca além do `exp` do token.
 *
 * O cache é por processo: cada réplica (e o runtime do middleware, separado
 * do das rotas) mantém o seu; um miss só custa uma chamada ao Heimdall.
 */

export const HEIMDALL_USER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

export const HEIMDALL_USER_CACHE_MAX_ENTRIES = 1000

type CacheEntry = {
  user: HeimdallUser
  expiresAt: number
}

const entries = new Map<string, CacheEntry>()

async function hashToken(accessToken: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(accessToken)
  )
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

/**
 * Lê o `exp` (em ms) do payload do JWT, sem validar a assinatura: serve só
 * para não manter a entrada além da vida do token.
 * @returns instante de expiração em ms, ou `null` se o token não o informa
 */
function getTokenExpiryMs(accessToken: string): number | null {
  const segment = accessToken.split('.')[1]
  if (!segment) {
    return null
  }

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))

    if (payload && typeof payload === 'object' && 'exp' in payload) {
      const exp = (payload as { exp: unknown }).exp
      if (typeof exp === 'number' && Number.isFinite(exp)) {
        return exp * 1000
      }
    }
    return null
  } catch {
    return null
  }
}

function copyUser(user: HeimdallUser): HeimdallUser {
  return {
    ...user,
    groups: user.groups ? [...user.groups] : user.groups,
    roles: user.roles ? [...user.roles] : user.roles,
  }
}

function evictForInsert(now: number): void {
  if (entries.size < HEIMDALL_USER_CACHE_MAX_ENTRIES) {
    return
  }

  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) {
      entries.delete(key)
    }
  }

  // Ainda cheio: descarta as entradas mais antigas (ordem de inserção)
  while (entries.size >= HEIMDALL_USER_CACHE_MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value
    if (oldestKey === undefined) {
      return
    }
    entries.delete(oldestKey)
  }
}

/**
 * Devolve o usuário em cache para este `access_token`, se ainda válido.
 * @param accessToken - JWT da sessão (cookie `access_token`)
 * @param now - instante atual em ms (injetável para teste)
 */
export async function getCachedHeimdallUser(
  accessToken: string,
  now: number = Date.now()
): Promise<HeimdallUser | null> {
  if (!accessToken) {
    return null
  }

  const key = await hashToken(accessToken)
  const entry = entries.get(key)
  if (!entry) {
    return null
  }

  if (entry.expiresAt <= now) {
    entries.delete(key)
    return null
  }

  return copyUser(entry.user)
}

/**
 * Guarda o usuário que o Heimdall devolveu para este `access_token`.
 * Não guarda nada se o token já expirou.
 * @param accessToken - JWT com que o Heimdall foi consultado
 * @param user - resposta do Heimdall `/users/me`
 * @param now - instante atual em ms (injetável para teste)
 */
export async function setCachedHeimdallUser(
  accessToken: string,
  user: HeimdallUser,
  now: number = Date.now()
): Promise<void> {
  if (!accessToken) {
    return
  }

  const tokenExpiry = getTokenExpiryMs(accessToken)
  const expiresAt = Math.min(
    now + HEIMDALL_USER_CACHE_TTL_MS,
    tokenExpiry ?? Number.POSITIVE_INFINITY
  )
  if (expiresAt <= now) {
    return
  }

  const key = await hashToken(accessToken)
  entries.delete(key)
  evictForInsert(now)
  entries.set(key, { user: copyUser(user), expiresAt })
}

/**
 * Usuário do Heimdall para este `access_token`: do cache do servidor ou, no
 * miss, de `fetchUser` (o Heimdall). Falha do Heimdall devolve `null` e não
 * é guardada.
 * @param accessToken - JWT da sessão (cookie `access_token`)
 * @param fetchUser - consulta ao Heimdall `/users/me` com esse token
 */
export async function resolveHeimdallUser(
  accessToken: string,
  fetchUser: () => Promise<HeimdallUser | null>
): Promise<HeimdallUser | null> {
  const cached = await getCachedHeimdallUser(accessToken)
  if (cached) {
    return cached
  }

  const user = await fetchUser()
  if (!user) {
    return null
  }

  await setCachedHeimdallUser(accessToken, user)
  return copyUser(user)
}

/** Esvazia o cache (testes). */
export function resetHeimdallUserServerCache(): void {
  entries.clear()
}
