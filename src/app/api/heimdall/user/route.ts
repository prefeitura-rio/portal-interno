import type { HeimdallUser } from '@/types/heimdall-roles'
import { HEIMDALL_USER_COOKIE_CONFIG, HEIMDALL_USER_COOKIE_NAME } from '@/lib/auth-cookie-config'
import { getCurrentUserFromCacheOrHeimdall } from '@/lib/heimdall-user'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * API Route to fetch current user information from Heimdall
 *
 * This is a server-side route that:
 * 1. Retrieves the access_token from HTTP-only cookies
 * 2. Calls Heimdall API to get user info with roles
 * 3. Returns the user data to the client
 *
 * The access_token is in HTTP-only cookies, so client-side code cannot access it directly.
 * This route acts as a proxy to fetch user data from Heimdall.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const cachedUserCookie = cookieStore.get(HEIMDALL_USER_COOKIE_NAME)

    if (cachedUserCookie?.value) {
      try {
        const parsed = JSON.parse(cachedUserCookie.value) as HeimdallUser
        if (parsed && parsed.id && parsed.cpf) {
          return NextResponse.json(parsed, { status: 200 })
        }
      } catch {
        // fallthrough to refetch
      }
    }

    const user = await getCurrentUserFromCacheOrHeimdall()

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 401 }
      )
    }

    const response = NextResponse.json(user, { status: 200 })

    try {
      response.cookies.set(
        HEIMDALL_USER_COOKIE_NAME,
        JSON.stringify(user),
        HEIMDALL_USER_COOKIE_CONFIG
      )
    } catch {
      // ignore cookie write errors in API route
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
