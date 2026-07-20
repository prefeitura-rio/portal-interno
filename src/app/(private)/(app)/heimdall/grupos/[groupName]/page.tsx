'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { use } from 'react'
import { HeimdallPageHeader } from '../../components/heimdall-page-header'
import { GroupInfoSection } from './components/group-info-section'
import { GroupMembersSection } from './components/group-members-section'
import { GroupRolesSection } from './components/group-roles-section'

export default function HeimdallGrupoDetalhePage({
  params,
}: {
  params: Promise<{ groupName: string }>
}) {
  const { groupName } = use(params)
  const decodedGroupName = decodeURIComponent(groupName)

  return (
    <ContentLayout title={`Grupo ${decodedGroupName}`}>
      <div className="space-y-6">
        <HeimdallPageHeader
          title={decodedGroupName}
          description="Gerencie os membros e papéis deste grupo."
          breadcrumbs={[
            { label: 'Grupos', href: '/heimdall/grupos' },
            { label: decodedGroupName },
          ]}
        />
        <GroupInfoSection groupName={decodedGroupName} />
        <GroupMembersSection groupName={decodedGroupName} />
        <GroupRolesSection groupName={decodedGroupName} />
      </div>
    </ContentLayout>
  )
}
