import { type NextRequest, NextResponse } from 'next/server'
import {
  REDIRECT_WHEN_SESSION_EXPIRED_ROUTE,
  REDIRECT_WHEN_UNAUTHORIZED_ROUTE,
} from '../constants/url'
import { refreshAccessToken } from './token-refresh'

export async function handleExpiredToken(
  request: NextRequest,
  refreshToken: string | undefined,
  requestHeaders: Headers,
  contentSecurityPolicyHeaderValue: string
): Promise<NextResponse> {
  // Try to refresh the token if we have a refresh token
  if (refreshToken) {
    const refreshResult = await refreshAccessToken(refreshToken)

    if (refreshResult.success && refreshResult.accessToken) {
      // Token refresh successful, create response with new tokens
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })

      // Set new tokens in cookies
      response.cookies.set('access_token', refreshResult.accessToken, {
        httpOnly: true,
        path: '/',
      })

      if (refreshResult.newRefreshToken) {
        response.cookies.set('refresh_token', refreshResult.newRefreshToken, {
          httpOnly: true,
          path: '/',
        })
      }

      response.headers.set(
        'Content-Security-Policy',
        contentSecurityPolicyHeaderValue
      )
      return response
    }
  }

  // Token refresh failed or no refresh token, redirect to session expired
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = REDIRECT_WHEN_SESSION_EXPIRED_ROUTE
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  )
  return response
}

export async function handleUnauthorizedUser(
  request: NextRequest,
  requestHeaders: Headers,
  contentSecurityPolicyHeaderValue: string
): Promise<NextResponse> {
  // Redirect to unauthorized page
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = REDIRECT_WHEN_UNAUTHORIZED_ROUTE
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  )
  return response
}

/**
 * Fetches user roles from Heimdall API in middleware context
 * This is optimized for Edge Runtime
 *
 * @param accessToken - The user's access token
 * @returns Array of user roles or null if failed
 */
export async function getUserRolesInMiddleware(
  accessToken: string
): Promise<string[] | null> {
  const requestId = Math.random().toString(36).substring(7)

  try {
    const baseUrl = process.env.NEXT_PUBLIC_HEIMDALL_BASE_API_URL

    if (!baseUrl) {
      console.error(
        `[${requestId}] NEXT_PUBLIC_HEIMDALL_BASE_API_URL is not set`
      )
      return null
    }

    // Construct the URL for Heimdall user info endpoint
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const apiUrl = new URL('api/v1/users/me', normalizedBaseUrl)

    console.log(
      `[${requestId}] Fetching user roles from Heimdall API: ${apiUrl.toString()}`
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
        `[${requestId}] Heimdall API response status: ${response.status}`
      )

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Unable to read error body')
        console.error(
          `[${requestId}] Heimdall API returned status ${response.status}. Error body:`,
          errorText
        )
        return null
      }

      const data = await response.json()
      const roles = data.roles || []
      console.log(
        `[${requestId}] Successfully fetched ${roles.length} roles:`,
        roles
      )
      return roles
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(
          `[${requestId}] Heimdall API request timed out after 10 seconds`
        )
      } else {
        console.error(
          `[${requestId}] Fetch error when calling Heimdall API:`,
          fetchError instanceof Error ? fetchError.message : String(fetchError),
          fetchError instanceof Error ? fetchError.stack : ''
        )
      }
      return null
    }
  } catch (error) {
    console.error(
      `[${requestId}] Error fetching user roles from Heimdall in middleware:`,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : ''
    )
    return null
  }
}
