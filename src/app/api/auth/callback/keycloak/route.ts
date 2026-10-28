import { REDIRECT_WHEN_LOGIN_FAILED_ROUTE } from '@/constants/url'
import {
  HEIMDALL_USER_COOKIE_NAME,
  getAccessTokenCookieConfig,
  getRefreshTokenCookieConfig,
} from '@/lib/auth-cookie-config'
import {
  previewBodyForLog,
  readKeycloakTokenResponse,
} from '@/lib/keycloak-token-response'
// src/app/api/auth/callback/keycloak/route.ts
import { type NextRequest, NextResponse } from 'next/server'

const CALLBACK_PATH_PATTERN = /\/api\/auth\/callback\/keycloak\/?$/

/**
 * URL pública do portal, derivada do redirect URI do Keycloak (a mesma base
 * para onde o login bem-sucedido volta). Sem redirect URI válido, usa a
 * origem da requisição. Sempre absoluta: `NextResponse.redirect` não aceita
 * URL relativa.
 */
function getAppBaseUrl(req: NextRequest): URL {
  const redirectUri = process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI
  if (redirectUri) {
    try {
      const base = new URL(redirectUri)
      base.pathname = base.pathname.replace(CALLBACK_PATH_PATTERN, '') || '/'
      base.search = ''
      base.hash = ''
      return base
    } catch {
      console.error(
        '[KEYCLOAK_CALLBACK] Invalid NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI; using request origin'
      )
    }
  }
  return new URL('/', req.nextUrl.origin)
}

function redirectToLoginError(appBaseUrl: URL): NextResponse {
  return NextResponse.redirect(
    new URL(REDIRECT_WHEN_LOGIN_FAILED_ROUTE, appBaseUrl.origin)
  )
}

export async function GET(req: NextRequest) {
  const appBaseUrl = getAppBaseUrl(req)
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) {
    console.warn('[KEYCLOAK_CALLBACK] Callback without authorization code:', {
      error: previewBodyForLog(searchParams.get('error') ?? '') || null,
    })
    return redirectToLoginError(appBaseUrl)
  }

  const tokenUrl = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/token`
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID!,
    client_secret: process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI!,
  })

  let response: Response
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
  } catch (error) {
    console.error('[KEYCLOAK_CALLBACK] Token request failed:', {
      error: error instanceof Error ? error.message : String(error),
    })
    return redirectToLoginError(appBaseUrl)
  }

  const result = await readKeycloakTokenResponse(response)

  if (!result.ok) {
    console.error('[KEYCLOAK_CALLBACK] Token exchange failed:', {
      reason: result.reason,
      ...result.diagnostics,
    })
    return redirectToLoginError(appBaseUrl)
  }

  const { tokens } = result

  // Log da resposta do Keycloak para debug de TTL
  console.log('[KEYCLOAK_CALLBACK] Token response from Keycloak:', {
    expires_in: tokens.expiresIn,
    refresh_expires_in: tokens.refreshExpiresIn,
    expires_in_minutes: tokens.expiresIn
      ? Math.floor(tokens.expiresIn / 60)
      : null,
    expires_in_hours: tokens.expiresIn
      ? Math.floor(tokens.expiresIn / 3600)
      : null,
    refresh_expires_in_minutes: tokens.refreshExpiresIn
      ? Math.floor(tokens.refreshExpiresIn / 60)
      : null,
  })

  const res = NextResponse.redirect(appBaseUrl)
  res.cookies.set(
    'access_token',
    tokens.accessToken,
    getAccessTokenCookieConfig(tokens.accessToken)
  )
  if (tokens.refreshToken) {
    res.cookies.set(
      'refresh_token',
      tokens.refreshToken,
      getRefreshTokenCookieConfig(tokens.refreshToken)
    )
  }
  // Clear the legacy heimdall_user cookie: it is no longer written nor trusted
  // (roles come from Heimdall via the server-side cache keyed by access_token).
  res.cookies.set(HEIMDALL_USER_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  })

  return res
}
