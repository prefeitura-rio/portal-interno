// src/app/api/auth/callback/keycloak/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import {
  getAccessTokenCookieConfig,
  getRefreshTokenCookieConfig,
} from '@/lib/auth-cookie-config'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect('/')

  const tokenUrl = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/token`
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID!,
    client_secret: process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI!,
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!response.ok) return NextResponse.redirect('/')

  const data = await response.json()
  const redirectUri = process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI!
  const baseRedirect = redirectUri.replace(
    /\/api\/auth\/callback\/keycloak$/,
    ''
  )
  const res = NextResponse.redirect(baseRedirect)
  res.cookies.set(
    'access_token',
    data.access_token,
    getAccessTokenCookieConfig(data.access_token)
  )
  res.cookies.set(
    'refresh_token',
    data.refresh_token,
    getRefreshTokenCookieConfig(data.refresh_token)
  )

  return res
}
