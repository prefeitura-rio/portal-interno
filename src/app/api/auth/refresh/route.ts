import { refreshAccessToken } from '@/lib/token-refresh'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = cookies()
    const refreshToken = (await cookieStore).get('refresh_token')

    if (!refreshToken) {
      console.log('❌ No refresh token found')
      return NextResponse.json(
        {
          success: false,
          error: 'No refresh token available',
        },
        { status: 401 }
      )
    }

    console.log('🔄 Refreshing access token...')

    const refreshResult = await refreshAccessToken(refreshToken.value)

    if (refreshResult.success && refreshResult.accessToken) {
      console.log('✅ Token refresh successful')

      const response = NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
      })

      // Set new access token
      response.cookies.set('access_token', refreshResult.accessToken, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      // Set new refresh token if provided
      if (refreshResult.newRefreshToken) {
        response.cookies.set('refresh_token', refreshResult.newRefreshToken, {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        })
      }

      return response
    }

    console.log('❌ Token refresh failed:', refreshResult.error)
    return NextResponse.json(
      {
        success: false,
        error: refreshResult.error || 'Failed to refresh token',
      },
      { status: 401 }
    )
  } catch (error) {
    console.error('❌ Error during token refresh:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during token refresh',
      },
      { status: 500 }
    )
  }
}
