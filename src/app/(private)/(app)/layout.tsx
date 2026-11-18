//layout.tsx
import AdminPanelLayout from '@/components/admin-panel/admin-panel-layout'
import { QueryProvider } from '@/components/providers/query-provider'
import { UserProvider } from '@/components/providers/user-provider'
import { Toaster } from '@/components/ui/sonner'
import { FeatureFlagsProvider } from '@/contexts/feature-flags-context'
import { HeimdallUserProvider } from '@/contexts/heimdall-user-context'
import { getRuntimeFeatureFlags } from '@/lib/feature-flags'
import { getUserInfoFromToken } from '@/lib/user-info'
import { connection } from 'next/server'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const userInfo = await getUserInfoFromToken()
  // Flags de runtime (DEV-644): lidas a cada requisição, nunca no build
  await connection()
  const featureFlags = getRuntimeFeatureFlags()

  return (
    //add shadcn sonner
    <>
      <UserProvider userInfo={userInfo}>
        <HeimdallUserProvider>
          <FeatureFlagsProvider flags={featureFlags}>
            <QueryProvider>
              <Toaster />
              <AdminPanelLayout>
                <NuqsAdapter>{children}</NuqsAdapter>
              </AdminPanelLayout>
            </QueryProvider>
          </FeatureFlagsProvider>
        </HeimdallUserProvider>
      </UserProvider>
    </>
  )
}
