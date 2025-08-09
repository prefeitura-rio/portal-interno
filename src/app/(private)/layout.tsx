import { SessionExpiredHandler } from '@/components/session-expired-handler'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div>
      <SessionExpiredHandler />
      {children}
    </div>
  )
}
