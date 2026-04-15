import { HEIMDALL_USER_COOKIE_NAME } from '@/lib/auth-cookie-config'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  // Get refresh token from cookies
  const cookieStore = cookies()
  const refreshToken = (await cookieStore).get('refresh_token')?.value

  // Call Keycloak logout endpoint if refresh token exists
  if (refreshToken) {
    const logoutUrl = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/logout`
    const clientId = process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID
    const clientSecret = process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Keycloak client ID or secret')
      // Optionally, return a specific error response to the client
      // return new NextResponse('Server configuration error', { status: 500 })
      // For now, we'll proceed to clear cookies as a fallback
    } else {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      })
      try {
        await fetch(logoutUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        })
      } catch (e) {
        console.error('Error logging out from Keycloak:', e)
      }
    }
  }

  // Clear authentication cookies
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set('access_token', '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  })
  response.cookies.set('refresh_token', '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  })
  // Also clear the cached Heimdall user snapshot so the next login refetches
  // fresh roles. Without this, role changes (e.g. adding go:cursos:casa_civil
  // in Heimdall) would only take effect after the cookie's TTL expired.
  response.cookies.set(HEIMDALL_USER_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    maxAge: 0,
  })
  return response
}
