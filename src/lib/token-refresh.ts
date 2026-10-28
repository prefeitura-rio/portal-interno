import { readKeycloakTokenResponse } from './keycloak-token-response'

export interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  newRefreshToken?: string
  error?: string
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  try {
    const tokenUrl = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/token`
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID!,
      client_secret: process.env.IDENTIDADE_CARIOCA_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const result = await readKeycloakTokenResponse(response)

    if (!result.ok) {
      const { status, contentType, bodyPreview } = result.diagnostics
      console.error('[TOKEN_REFRESH] Refresh failed:', {
        reason: result.reason,
        status,
        contentType,
        bodyPreview,
      })
      return {
        success: false,
        error: `Failed to refresh token: ${status} - ${result.reason}`,
      }
    }

    const { tokens } = result

    // Log da resposta do Keycloak para debug de TTL
    console.log('[TOKEN_REFRESH] Token response from Keycloak:', {
      expires_in: tokens.expiresIn,
      refresh_expires_in: tokens.refreshExpiresIn,
      expires_in_minutes: tokens.expiresIn
        ? Math.floor(tokens.expiresIn / 60)
        : null,
      expires_in_hours: tokens.expiresIn
        ? Math.floor(tokens.expiresIn / 3600)
        : null,
      refresh_expires_in_minutes: tokens.refreshExpiresIn
        ? Math.floor(tokens.refreshExpiresIn / 60)
        : null,
    })

    return {
      success: true,
      accessToken: tokens.accessToken,
      newRefreshToken: tokens.refreshToken,
    }
  } catch (error) {
    console.error('❌ Network error during token refresh:', error)
    return {
      success: false,
      error: `Network error during token refresh: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
