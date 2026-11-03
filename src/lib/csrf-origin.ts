/**
 * Defesa contra CSRF nas rotas de API (BFF): uma requisição que muda estado
 * (qualquer método fora de GET/HEAD/OPTIONS) só segue quando o navegador
 * atesta que ela partiu do próprio portal.
 *
 * Os cookies de sessão (`access_token`/`refresh_token`) são `SameSite=Lax`, e
 * um site irmão em `*.dados.rio` é "same-site": o navegador mandaria os
 * cookies num POST dele. Por isso a regra é mesma **origem**, não mesmo site:
 *
 * - com `Origin`, o host dele precisa ser o host da própria requisição (o
 *   esquema não entra porque o TLS termina no proxy, antes do Next);
 *   `Origin: null` (iframe sandbox, redirecionamento entre origens) é recusada;
 * - sem `Origin`, `Sec-Fetch-Site` precisa ser `same-origin` ou `none`;
 * - sem nenhum dos dois, a requisição não veio de um navegador moderno (curl,
 *   chamada de servidor), que não carrega cookie de terceiros: segue para o
 *   RBAC, que exige o token de sessão.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'none'])

export type CsrfOriginVerdict =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly reason: 'cross-origin' | 'cross-site-fetch' | 'invalid-origin'
    }

/** Subconjunto de `NextRequest` que a verificação lê. */
export interface CsrfOriginRequest {
  readonly method: string
  readonly headers: Pick<Headers, 'get'>
  readonly nextUrl: { readonly host: string }
}

export function isStateChangingMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}

/** Primeiro valor de um cabeçalho que pode vir em lista (proxies em cadeia). */
function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(',')[0]?.trim().toLowerCase()
  return first ? first : null
}

/** Hosts pelos quais o próprio portal foi alcançado nesta requisição. */
function ownHosts(request: CsrfOriginRequest): Set<string> {
  const hosts = new Set<string>()
  for (const host of [
    firstHeaderValue(request.headers.get('x-forwarded-host')),
    firstHeaderValue(request.headers.get('host')),
    request.nextUrl.host.toLowerCase(),
  ]) {
    if (host) {
      hosts.add(host)
    }
  }
  return hosts
}

function originHost(origin: string): string | null {
  if (origin === 'null') {
    return null
  }
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }
    return url.host.toLowerCase()
  } catch {
    return null
  }
}

export function checkCsrfOrigin(request: CsrfOriginRequest): CsrfOriginVerdict {
  if (!isStateChangingMethod(request.method)) {
    return { allowed: true }
  }

  const origin = request.headers.get('origin')?.trim()
  if (origin) {
    const host = originHost(origin)
    if (!host) {
      return { allowed: false, reason: 'invalid-origin' }
    }
    return ownHosts(request).has(host)
      ? { allowed: true }
      : { allowed: false, reason: 'cross-origin' }
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase()
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    return { allowed: false, reason: 'cross-site-fetch' }
  }

  return { allowed: true }
}
