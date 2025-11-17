'use client'
import { TokenRefreshProvider } from '@/components/providers/token-refresh-provider'
import { SessionExpiredHandler } from '@/components/session-expired-handler'
import { UnauthorizedHandler } from '@/components/unauthorized-handler'
import applyGoogleTranslateDOMPatch from '@/utils/apply-google-translate-DOM-patch';
import { useEffect } from 'react';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useEffect(() => {
    applyGoogleTranslateDOMPatch();
  }, []);
  return (
    <>
    <TokenRefreshProvider>
      <div>
        <SessionExpiredHandler />
        <UnauthorizedHandler />
        {children}
      </div>
    </TokenRefreshProvider>
    </>
  )
}
