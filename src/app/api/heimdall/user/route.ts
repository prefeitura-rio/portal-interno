import {
  AUTH_COOKIE_CONFIG,
  HEIMDALL_USER_COOKIE_NAME,
} from '@/lib/auth-cookie-config'
import { getCurrentUserFromCacheOrHeimdall } from '@/lib/heimdall-user'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * API Route to fetch current user information from Heimdall
 *
 * This is a server-side route that:
 * 1. Retrieves the access_token from HTTP-only cookies
 * 2. Calls Heimdall API to get user info with roles (server-side cache keyed
 *    by the access_token; the client-controlled heimdall_user cookie is ignored)
 * 3. Returns the user data to the client
 *
 * The access_token is in HTTP-only cookies, so client-side code cannot access it directly.
 * This route acts as a proxy to fetch user data from Heimdall.
 */
export async function GET() {
  try {
    // Nunca responde a partir do cookie heimdall_user: ele vem do cliente.
    const user = await getCurrentUserFromCacheOrHeimdall()

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 401 }
      )
    }

    const response = NextResponse.json(user, { status: 200 })

    const cookieStore = await cookies()
    if (cookieStore.has(HEIMDALL_USER_COOKIE_NAME)) {
      // Apaga o cookie legado (ou forjado) que não é mais usado
      response.cookies.set(HEIMDALL_USER_COOKIE_NAME, '', {
        ...AUTH_COOKIE_CONFIG,
        maxAge: 0,
      })
    }

    return response
  } catch (error) {
    console.error('Error fetching user info from Heimdall:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
