//layout.tsx
import AdminPanelLayout from '@/components/admin-panel/admin-panel-layout'

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <AdminPanelLayout>{children}</AdminPanelLayout>
}
