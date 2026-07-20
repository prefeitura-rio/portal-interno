'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { GroupsDataTable } from './components/groups-data-table'

export default function HeimdallGruposPage() {
  return (
    <ContentLayout title="Grupos">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Grupos"
          description="Gerencie os grupos de usuários do Heimdall, seus membros e papéis."
          breadcrumbs={[{ label: 'Grupos' }]}
        />
        <GroupsDataTable />
      </div>
    </ContentLayout>
  )
}
