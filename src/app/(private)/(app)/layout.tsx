//layout.tsx
import AdminPanelLayout from '@/components/admin-panel/admin-panel-layout'
import { UserProvider } from '@/components/providers/user-provider'
import { Toaster } from '@/components/ui/sonner'
import { getUserInfoFromToken } from '@/lib/user-info'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const userInfo = await getUserInfoFromToken()

  return (
    //add shadcn sonner
    <UserProvider userInfo={userInfo}>
      <Toaster />
      <AdminPanelLayout>
        <NuqsAdapter>{children}</NuqsAdapter>
      </AdminPanelLayout>
    </UserProvider>
  )
}
