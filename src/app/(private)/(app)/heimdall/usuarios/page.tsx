'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { UsersDataTable } from './components/users-data-table'

export default function HeimdallUsuariosPage() {
  return (
    <ContentLayout title="Usuários">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Usuários"
          description="Consulte os usuários cadastrados no Heimdall, seus grupos e papéis."
          breadcrumbs={[{ label: 'Usuários' }]}
        />
        <UsersDataTable />
      </div>
    </ContentLayout>
  )
}
