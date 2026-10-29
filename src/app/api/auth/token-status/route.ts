import { buildTokenStatus, buildTokenStatusError } from '@/lib/token-status'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Desabilitar cache completamente nesta rota
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Só metadados no corpo: os valores dos cookies HttpOnly access_token e
// refresh_token nunca são devolvidos ao browser (pentest vuln-0004)
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value

    const status = buildTokenStatus(accessToken, refreshToken)

    if (!accessToken) {
      return NextResponse.json(status, { status: 401 })
    }

    const response = NextResponse.json(status, { status: 200 })

    // Headers anti-cache
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Error checking token status:', error)
    return NextResponse.json(buildTokenStatusError(), { status: 500 })
  }
}
