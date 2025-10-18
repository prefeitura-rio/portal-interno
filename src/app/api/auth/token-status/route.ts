import { isJwtExpired } from '@/lib/jwt-utils'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = cookies()
    const accessToken = (await cookieStore).get('access_token')
    const refreshToken = (await cookieStore).get('refresh_token')

    if (!accessToken) {
      return NextResponse.json(
        {
          authenticated: false,
          token: null,
          refreshToken: null,
          message: 'No access token found',
        },
        { status: 401 }
      )
    }

    const isExpired = isJwtExpired(accessToken.value)

    return NextResponse.json(
      {
        authenticated: !isExpired,
        token: accessToken.value,
        refreshToken: refreshToken?.value || null,
        isExpired,
        message: isExpired ? 'Token expired' : 'Token valid',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error checking token status:', error)
    return NextResponse.json(
      {
        authenticated: false,
        token: null,
        refreshToken: null,
        message: 'Error checking token status',
      },
      { status: 500 }
    )
  }
}
