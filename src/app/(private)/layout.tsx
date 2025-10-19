import { TokenRefreshProvider } from '@/components/providers/token-refresh-provider'
import { SessionExpiredHandler } from '@/components/session-expired-handler'
import { UnauthorizedHandler } from '@/components/unauthorized-handler'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TokenRefreshProvider>
      <div>
        <SessionExpiredHandler />
        <UnauthorizedHandler />
        {children}
      </div>
    </TokenRefreshProvider>
  )
}
