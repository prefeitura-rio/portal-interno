import { getUserRole } from '@/lib/jwt-utils'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = cookies()
    const accessToken = (await cookieStore).get('access_token')

    if (!accessToken) {
      return NextResponse.json({ role: null }, { status: 200 })
    }

    const userRole = getUserRole(accessToken.value)

    return NextResponse.json({ role: userRole }, { status: 200 })
  } catch (error) {
    console.error('Error getting user role:', error)
    return NextResponse.json({ role: null }, { status: 500 })
  }
}
