import type { HeimdallUser } from '@/types/heimdall-roles'
import { type NextRequest, NextResponse } from 'next/server'
import {
  REDIRECT_WHEN_SESSION_EXPIRED_ROUTE,
  REDIRECT_WHEN_UNAUTHORIZED_ROUTE,
} from '../constants/url'
import {
  HEIMDALL_USER_COOKIE_CONFIG,
  HEIMDALL_USER_COOKIE_NAME,
  getAccessTokenCookieConfig,
  getRefreshTokenCookieConfig,
} from './auth-cookie-config'
import { refreshAccessToken } from './token-refresh'
/**
 * Extracts CPF from JWT token for logging purposes
 * @param accessToken - The user's access token
 * @returns CPF string or 'unknown' if not found
 */
function getCpfFromToken(accessToken: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    )
    return payload.preferred_username || payload.cpf || payload.sub || 'unknown'
  } catch {
    return 'unknown'
  }
}

type HeimdallUserFromApi = {
  id: number
  cpf: string
  display_name?: string
  groups?: string[]
  roles?: string[]
}

async function fetchHeimdallUserFromApi(
  accessToken: string
): Promise<HeimdallUser | null> {
  const cpf = getCpfFromToken(accessToken)
  const requestId = Math.random().toString(36).substring(7)

  try {
    const baseUrl = process.env.NEXT_PUBLIC_HEIMDALL_BASE_API_URL

    if (!baseUrl) {
      console.error(
        `[${cpf}] [${requestId}] NEXT_PUBLIC_HEIMDALL_BASE_API_URL is not set`
      )
      return null
    }

    // Construct the URL for Heimdall user info endpoint
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const apiUrl = new URL('api/v1/users/me', normalizedBaseUrl)

    console.log(
      `[${cpf}] [${requestId}] Fetching user roles from Heimdall API: ${apiUrl.toString()}`
    )

    // Make the request to Heimdall API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        // Add cache control to avoid stale data
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(
        `[${cpf}] [${requestId}] Heimdall API response status: ${response.status}`
      )

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error body')
        console.error(
          `[${cpf}] [${requestId}] Heimdall API returned status ${response.status}. Error body:`,
          errorText
        )
        return null
      }

      const data = (await response.json()) as HeimdallUserFromApi
      const user: HeimdallUser = {
        id: data.id,
        cpf: data.cpf,
        display_name: data.display_name,
        groups: data.groups,
        roles: data.roles,
      }

      console.log(
        `[${cpf}] [${requestId}] Successfully fetched Heimdall user with ${user.roles?.length ?? 0} roles`
      )

      return user
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(
          `[${cpf}] [${requestId}] Heimdall API request timed out after 10 seconds`
        )
      } else {
        console.error(
          `[${cpf}] [${requestId}] Fetch error when calling Heimdall API:`,
          fetchError instanceof Error ? fetchError.message : String(fetchError),
          fetchError instanceof Error ? fetchError.stack : ''
        )
      }
      return null
    }
  } catch (error) {
    console.error(
      `[${cpf}] [${requestId}] Error fetching user from Heimdall in middleware:`,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : ''
    )
    return null
  }
}

export async function getUserFromHeimdallWithCache(
  request: NextRequest,
  response: NextResponse,
  accessToken: string
): Promise<HeimdallUser | null> {
  const cpf = getCpfFromToken(accessToken)

  // 1. Tenta ler do cookie de usuário
  const userCookie = request.cookies.get(HEIMDALL_USER_COOKIE_NAME)

  if (userCookie?.value) {
    try {
      const parsed = JSON.parse(userCookie.value) as HeimdallUser
      if (parsed && parsed.roles && Array.isArray(parsed.roles)) {
        console.log(
          `[${cpf}] [MIDDLEWARE_HELPERS] Using Heimdall user from cookie with ${parsed.roles.length} roles`
        )
        return parsed
      }
    } catch (error) {
      console.warn(
        `[${cpf}] [MIDDLEWARE_HELPERS] Failed to parse heimdall_user cookie, will refetch from API`,
        error
      )
    }
  }

  // 2. Cache miss ou cookie inválido -> chama Heimdall /me
  const user = await fetchHeimdallUserFromApi(accessToken)

  if (!user) {
    return null
  }

  // 3. Grava snapshot do usuário no cookie de resposta
  try {
    const serialized = JSON.stringify(user)
    response.cookies.set(HEIMDALL_USER_COOKIE_NAME, serialized, {
      ...HEIMDALL_USER_COOKIE_CONFIG,
    })

    console.log(
      `[${cpf}] [MIDDLEWARE_HELPERS] heimdall_user cookie set with ${user.roles?.length ?? 0} roles`
    )
  } catch (error) {
    console.error(
      `[${cpf}] [MIDDLEWARE_HELPERS] Failed to serialize/set heimdall_user cookie`,
      error
    )
  }

  return user
}

export async function handleExpiredToken(
  request: NextRequest,
  refreshToken: string | undefined
): Promise<NextResponse> {
  // Try to refresh the token if we have a refresh token
  if (refreshToken) {
    const refreshResult = await refreshAccessToken(refreshToken)

    if (refreshResult.success && refreshResult.accessToken) {
      // Token refresh successful, create response with new tokens
      const response = NextResponse.next()

      // Set new tokens in cookies
      response.cookies.set(
        'access_token',
        refreshResult.accessToken,
        getAccessTokenCookieConfig(refreshResult.accessToken)
      )

      if (refreshResult.newRefreshToken) {
        response.cookies.set(
          'refresh_token',
          refreshResult.newRefreshToken,
          getRefreshTokenCookieConfig(refreshResult.newRefreshToken)
        )
      }

      return response
    }
  }

  // Token refresh failed or no refresh token, redirect to session expired
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = REDIRECT_WHEN_SESSION_EXPIRED_ROUTE
  return NextResponse.redirect(redirectUrl)
}

export async function handleUnauthorizedUser(
  request: NextRequest
): Promise<NextResponse> {
  // Redirect to unauthorized page
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = REDIRECT_WHEN_UNAUTHORIZED_ROUTE
  return NextResponse.redirect(redirectUrl)
}
