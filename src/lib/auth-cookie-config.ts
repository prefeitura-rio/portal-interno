import { jwtDecode } from 'jwt-decode'

/**
 * Configuração base para cookies de autenticação.
 * Aplicada consistentemente em todos os pontos: callback, refresh e middleware.
 */
export const AUTH_COOKIE_CONFIG = {
  httpOnly: true,
  secure: true, // Sempre true - aplicação roda em HTTPS em produção
  sameSite: 'lax' as const, // Proteção CSRF com flexibilidade
  path: '/',
} as const

/**
 * Retorna configuração completa para o cookie de access_token,
 * incluindo maxAge calculado a partir da expiração do JWT.
 *
 * @param token - O access token JWT
 * @returns Configuração de cookie com maxAge baseado no exp claim
 */
export function getAccessTokenCookieConfig(token: string) {
  try {
    const decoded = jwtDecode<{ exp: number }>(token)

    // Calcular maxAge em segundos até a expiração
    const maxAge = decoded.exp - Math.floor(Date.now() / 1000)

    // Garantir que maxAge não seja negativo
    if (maxAge <= 0) {
      console.warn('⚠️ Access token já expirado ao criar cookie')
      return {
        ...AUTH_COOKIE_CONFIG,
        maxAge: 60, // 1 minuto como fallback
      }
    }

    return {
      ...AUTH_COOKIE_CONFIG,
      maxAge,
    }
  } catch (error) {
    console.error('❌ Erro ao decodificar access token para configuração de cookie:', error)
    // Fallback: 10 minutos (duração padrão do access token)
    return {
      ...AUTH_COOKIE_CONFIG,
      maxAge: 10 * 60,
    }
  }
}

/**
 * Retorna configuração completa para o cookie de refresh_token,
 * incluindo maxAge calculado a partir da expiração do JWT.
 *
 * @param token - O refresh token JWT
 * @returns Configuração de cookie com maxAge baseado no exp claim
 */
export function getRefreshTokenCookieConfig(token: string) {
  try {
    const decoded = jwtDecode<{ exp: number }>(token)

    // Calcular maxAge em segundos até a expiração
    const maxAge = decoded.exp - Math.floor(Date.now() / 1000)

    // Garantir que maxAge não seja negativo
    if (maxAge <= 0) {
      console.warn('⚠️ Refresh token já expirado ao criar cookie')
      return {
        ...AUTH_COOKIE_CONFIG,
        maxAge: 60, // 1 minuto como fallback
      }
    }

    return {
      ...AUTH_COOKIE_CONFIG,
      maxAge,
    }
  } catch (error) {
    console.error('❌ Erro ao decodificar refresh token para configuração de cookie:', error)
    // Fallback: 30 minutos (duração padrão do refresh token)
    return {
      ...AUTH_COOKIE_CONFIG,
      maxAge: 30 * 60,
    }
  }
}
