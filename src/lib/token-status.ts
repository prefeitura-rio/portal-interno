import { jwtDecode } from 'jwt-decode'
import { isJwtExpired } from './jwt-utils'

/**
 * Corpo de GET /api/auth/token-status.
 *
 * Só metadados: os valores dos cookies HttpOnly `access_token` e
 * `refresh_token` nunca saem do servidor (achado de pentest vuln-0004).
 */
export interface TokenStatus {
  authenticated: boolean
  isExpired: boolean
  hasRefreshToken: boolean
  /** Expiração do access token em epoch ms, ou null quando não há token ou `exp` legível */
  expiresAt: number | null
  message: string
}

function getJwtExpiresAt(token: string): number | null {
  try {
    const { exp } = jwtDecode<{ exp?: unknown }>(token)
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}

export function buildTokenStatus(
  accessToken: string | undefined,
  refreshToken: string | undefined
): TokenStatus {
  const hasRefreshToken = Boolean(refreshToken)

  if (!accessToken) {
    return {
      authenticated: false,
      isExpired: true,
      hasRefreshToken,
      expiresAt: null,
      message: 'No access token found',
    }
  }

  const isExpired = isJwtExpired(accessToken)

  return {
    authenticated: !isExpired,
    isExpired,
    hasRefreshToken,
    expiresAt: getJwtExpiresAt(accessToken),
    message: isExpired ? 'Token expired' : 'Token valid',
  }
}

export function buildTokenStatusError(): TokenStatus {
  return {
    authenticated: false,
    isExpired: true,
    hasRefreshToken: false,
    expiresAt: null,
    message: 'Error checking token status',
  }
}

export type TokenRefreshAction = 'logout' | 'refresh' | 'none'

/**
 * Decide o que o refresh proativo (use-token-refresh) faz com o status:
 * token expirado sem refresh_token → logout; expirado com refresh_token ou a
 * até `refreshBeforeExpiryMinutes` da expiração → refresh; senão nada.
 */
export function decideTokenRefreshAction(
  status: Pick<TokenStatus, 'isExpired' | 'hasRefreshToken' | 'expiresAt'>,
  now: number,
  refreshBeforeExpiryMinutes: number
): TokenRefreshAction {
  if (status.isExpired) {
    return status.hasRefreshToken ? 'refresh' : 'logout'
  }

  if (status.expiresAt === null) {
    return 'none'
  }

  const minutesUntilExpiry = Math.round((status.expiresAt - now) / 1000 / 60)

  if (
    minutesUntilExpiry <= refreshBeforeExpiryMinutes &&
    minutesUntilExpiry > 0
  ) {
    return 'refresh'
  }

  return 'none'
}
