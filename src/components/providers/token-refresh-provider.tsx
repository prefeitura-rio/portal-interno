'use client'

import { useTokenRefresh } from '@/hooks/use-token-refresh'
import { useEffect } from 'react'

interface TokenRefreshProviderProps {
  children: React.ReactNode
}

export function TokenRefreshProvider({ children }: TokenRefreshProviderProps) {
  const { startTokenMonitoring, stopTokenMonitoring, isMonitoring } =
    useTokenRefresh({
      checkInterval: 1, // Verificar a cada 1 minuto
      refreshBeforeExpiry: 2, // Refresh 2 minutos antes da expiração
    })

  useEffect(() => {
    // Iniciar o monitoramento quando o componente é montado
    startTokenMonitoring()

    // Cleanup ao desmontar
    return () => {
      stopTokenMonitoring()
    }
  }, [startTokenMonitoring, stopTokenMonitoring])

  return <>{children}</>
}
