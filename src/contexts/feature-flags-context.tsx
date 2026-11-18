'use client'

// Só o tipo: o módulo das flags é de servidor e não entra no bundle do client
import type { RuntimeFeatureFlags } from '@/lib/feature-flags'
import { createContext, useContext } from 'react'

/**
 * Feature flags de runtime vindas do servidor (DEV-644). O layout server lê as
 * variáveis (`getRuntimeFeatureFlags()`) e as passa como prop; o client nunca
 * lê as variáveis `FEATURE_*` do ambiente. Fora do provider, tudo fica desligado.
 */
const FeatureFlagsContext = createContext<RuntimeFeatureFlags>({
  coursesDashboard: false,
})

export function FeatureFlagsProvider({
  children,
  flags,
}: {
  children: React.ReactNode
  flags: RuntimeFeatureFlags
}) {
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags(): RuntimeFeatureFlags {
  return useContext(FeatureFlagsContext)
}
