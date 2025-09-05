import { jwtDecode } from 'jwt-decode'

export function isJwtExpired(token: string): boolean {
  try {
    const decoded: { exp?: number } = jwtDecode(token)
    if (!decoded.exp) return true // If no exp field, consider it expired
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp < now
  } catch {
    return false
  }
}

export function hasAdminLoginRole(token: string): boolean {
  const clientId = process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID
  if (!clientId) return false

  try {
    const decoded: {
      resource_access?: {
        [key: string]: {
          roles?: string[]
        }
      }
    } = jwtDecode(token)

    return !!decoded.resource_access?.[clientId]?.roles?.includes('admin:login')
  } catch {
    return false
  }
}
