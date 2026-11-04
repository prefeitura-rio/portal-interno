import { type NextRequest, NextResponse } from 'next/server'

/**
 * Parâmetro `state` do OAuth 2.0 (RFC 6749 §10.12) no login pelo Keycloak da
 * Identidade Carioca (DEV-262).
 *
 * Antes de cada ida ao endpoint `/auth` do Keycloak, o portal gera um valor
 * aleatório, grava-o num cookie httpOnly de curta duração e o envia como
 * `state`. O callback só troca o `code` por token quando o `state` da query é
 * igual ao do cookie; sem isso, um atacante conseguiria fazer o navegador da
 * vítima concluir o login com o `code` da conta dele (CSRF de login / fixação
 * de sessão).
 *
 * Módulo sem dependências de Node: roda no middleware (Edge) e nas rotas.
 */

/**
 * Prefixo `__Host-`: o navegador só aceita o cookie com `Secure`, `Path=/` e
 * sem `Domain`, então um subdomínio irmão não consegue plantar um `state`
 * conhecido para o portal.
 */
export const OAUTH_STATE_COOKIE_NAME = '__Host-oauth_state'

/** Tempo para concluir o login no Keycloak (inclui o gov.br). */
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60

const OAUTH_STATE_BYTES = 32
// 32 bytes em base64url sem padding = 43 caracteres
const OAUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/

export const OAUTH_STATE_COOKIE_CONFIG = {
  httpOnly: true,
  secure: true,
  // Lax: o retorno do Keycloak é uma navegação GET de topo vinda de outro
  // site, e o cookie precisa ir junto
  sameSite: 'lax' as const,
  path: '/',
} as const

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Novo `state` com 256 bits de um gerador criptograficamente seguro. */
export function generateOAuthState(): string {
  const bytes = new Uint8Array(OAUTH_STATE_BYTES)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export function isWellFormedOAuthState(
  value: string | null | undefined
): value is string {
  return typeof value === 'string' && OAUTH_STATE_PATTERN.test(value)
}

export type OAuthStateCheck =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: 'missing_query_state' | 'missing_cookie' | 'mismatch'
    }

/**
 * Confere o `state` devolvido pelo Keycloak contra o do cookie. Falha fechada:
 * ausente, malformado ou diferente é recusado. A comparação não para no
 * primeiro caractere diferente.
 */
export function verifyOAuthState(
  queryState: string | null | undefined,
  cookieState: string | null | undefined
): OAuthStateCheck {
  if (!queryState) {
    return { ok: false, reason: 'missing_query_state' }
  }
  if (!isWellFormedOAuthState(cookieState)) {
    return { ok: false, reason: 'missing_cookie' }
  }
  if (queryState.length !== cookieState.length) {
    return { ok: false, reason: 'mismatch' }
  }
  let diff = 0
  for (let i = 0; i < cookieState.length; i++) {
    diff |= queryState.charCodeAt(i) ^ cookieState.charCodeAt(i)
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'mismatch' }
}

/** URL do endpoint de autorização do Keycloak com o `state`. */
export function buildKeycloakAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID ?? '',
    redirect_uri: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI ?? '',
    response_type: 'code',
    state,
  })
  return `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/auth?${params.toString()}`
}

/**
 * Redireciona ao login do Keycloak gravando o cookie do `state`.
 *
 * Um `state` válido que já está no cookie (outro login começado há pouco, em
 * outra aba ou por uma requisição paralela) é reaproveitado e renovado, para
 * que o último redirect não invalide o login em andamento. Ele continua
 * secreto (httpOnly, `__Host-`) e é apagado pelo callback depois do uso.
 */
export function redirectToKeycloakLogin(request: NextRequest): NextResponse {
  const current = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value
  const state = isWellFormedOAuthState(current) ? current : generateOAuthState()

  const response = NextResponse.redirect(buildKeycloakAuthorizationUrl(state))
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    ...OAUTH_STATE_COOKIE_CONFIG,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  })
  return response
}

/** Apaga o cookie do `state` (uso único: o callback sempre o consome). */
export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', {
    ...OAUTH_STATE_COOKIE_CONFIG,
    maxAge: 0,
  })
}
