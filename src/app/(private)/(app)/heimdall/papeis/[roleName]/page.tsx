'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { use } from 'react'
import { HeimdallPageHeader } from '../../components/heimdall-page-header'
import { RoleActionsSection } from './components/role-actions-section'
import { RoleInfoSection } from './components/role-info-section'

export default function HeimdallPapelDetalhePage({
  params,
}: {
  params: Promise<{ roleName: string }>
}) {
  const { roleName } = use(params)
  const decodedRoleName = decodeURIComponent(roleName)

  return (
    <ContentLayout title={`Papel ${decodedRoleName}`}>
      <div className="space-y-6">
        <HeimdallPageHeader
          title={decodedRoleName}
          description="Gerencie as ações permitidas para este papel."
          breadcrumbs={[
            { label: 'Papéis', href: '/heimdall/papeis' },
            { label: decodedRoleName },
          ]}
        />
        <RoleInfoSection roleName={decodedRoleName} />
        <RoleActionsSection roleName={decodedRoleName} />
      </div>
    </ContentLayout>
  )
}
