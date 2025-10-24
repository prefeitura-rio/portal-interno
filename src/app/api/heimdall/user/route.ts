import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'
import type { HeimdallUser } from '@/types/heimdall-roles'
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
    const accessToken = cookieStore.get('access_token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      )
    }

    // Call Heimdall API to get current user info
    const response = await getCurrentUserInfoApiV1UsersMeGet()

    // Check if response is successful
    if (response.status !== 200) {
      console.error('Failed to fetch user info from Heimdall:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: response.status }
      )
    }

    // Extract user data from response
    const userData: HeimdallUser = {
      id: response.data.id,
      cpf: response.data.cpf,
      display_name: response.data.display_name || undefined,
      groups: response.data.groups,
      roles: response.data.roles,
    }

    return NextResponse.json(userData, { status: 200 })
  } catch (error) {
    console.error('Error fetching user info from Heimdall:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
