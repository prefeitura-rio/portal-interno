import { type TokenStatus, decideTokenRefreshAction } from '@/lib/token-status'
import { useCallback, useEffect, useRef } from 'react'

interface UseTokenRefreshOptions {
  /** Intervalo em minutos para verificar a expiração do token (padrão: 0.25 minutos = 15 segundos) */
  checkInterval?: number
  /** Minutos antes da expiração para fazer o refresh (padrão: 0.5 minutos = 30 segundos) */
  refreshBeforeExpiry?: number
}

interface UseTokenRefreshReturn {
  /** Iniciar o monitoramento do token */
  startTokenMonitoring: () => void
  /** Parar o monitoramento do token */
  stopTokenMonitoring: () => void
  /** Verificar se o monitoramento está ativo */
  isMonitoring: boolean
}

export function useTokenRefresh(
  options: UseTokenRefreshOptions = {}
): UseTokenRefreshReturn {
  const {
    checkInterval = 1, // 1 minuto
    refreshBeforeExpiry = 2, // Refresh 2 minutos antes da expiração
  } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMonitoringRef = useRef(false)

  const stopTokenMonitoring = useCallback(() => {
    if (!isMonitoringRef.current) {
      return
    }

    console.log('🛑 Stopping automatic token monitoring')

    isMonitoringRef.current = false

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing access token...')

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store', // CRÍTICO: Nunca cachear refresh de token
      })

      if (response.ok) {
        console.log('✅ Access token refreshed successfully')
        return true
      }

      console.error('❌ Token refresh failed:', response.status)
      return false
    } catch (error) {
      console.error('❌ Error during token refresh:', error)
      return false
    }
  }, [])

  const checkAndRefreshToken = useCallback(async () => {
    try {
      console.log('[useTokenRefresh] Checking token status...')

      // Verificar o status do token
      const tokenStatusResponse = await fetch('/api/auth/token-status', {
        credentials: 'include',
        cache: 'no-store', // CRÍTICO: Nunca cachear status de token
      })

      if (!tokenStatusResponse.ok) {
        console.log('🔍 User not authenticated, stopping token monitoring')
        stopTokenMonitoring()
        return
      }

      // O endpoint devolve só metadados (nunca os JWTs dos cookies HttpOnly)
      const tokenData: TokenStatus = await tokenStatusResponse.json()
      console.log('[useTokenRefresh] Token status:', {
        isExpired: tokenData.isExpired,
        hasRefreshToken: tokenData.hasRefreshToken,
        expiresAt: tokenData.expiresAt,
      })

      const action = decideTokenRefreshAction(
        tokenData,
        Date.now(),
        refreshBeforeExpiry
      )

      if (action === 'logout') {
        console.log('❌ No refresh token available, redirecting to login...')
        window.location.href = '/api/auth/logout'
        return
      }

      // Token expirado (com refresh_token) ou próximo da expiração
      if (action === 'refresh') {
        console.log('🚨 Token expired or close to expiry, refreshing...')

        const refreshSuccess = await refreshToken()

        if (!refreshSuccess) {
          console.error('❌ Refresh failed, redirecting to login...')
          window.location.href = '/api/auth/logout'
        }
      }
    } catch (error) {
      console.error('❌ Error during token verification:', error)
      // Em caso de erro, parar o monitoramento para evitar loops
      stopTokenMonitoring()
    }
  }, [refreshBeforeExpiry, refreshToken, stopTokenMonitoring])

  const startTokenMonitoring = useCallback(() => {
    if (isMonitoringRef.current) {
      return
    }

    console.log('🚀 Starting automatic token monitoring')

    isMonitoringRef.current = true

    // Verificação imediata
    checkAndRefreshToken()

    // Configurar intervalo
    intervalRef.current = setInterval(
      checkAndRefreshToken,
      checkInterval * 60 * 1000 // Converter minutos para milissegundos
    )
  }, [checkInterval, checkAndRefreshToken])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopTokenMonitoring()
    }
  }, [stopTokenMonitoring])

  return {
    startTokenMonitoring,
    stopTokenMonitoring,
    isMonitoring: isMonitoringRef.current,
  }
}
