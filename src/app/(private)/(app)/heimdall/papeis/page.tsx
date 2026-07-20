'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Button } from '@/components/ui/button'
import { Plus, Settings2, Shield, Wrench } from 'lucide-react'
import * as React from 'react'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { SummaryCards } from '../components/summary-cards'
import { useAllHeimdallRoles } from '../hooks/use-heimdall-roles'
import { RoleFormDialog } from './components/role-form-dialog'
import { RolesDataTable } from './components/roles-data-table'

export default function HeimdallPapeisPage() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const { data: allRoles, isLoading } = useAllHeimdallRoles()

  const totalRoles = allRoles?.length ?? 0
  const systemRoles = allRoles?.filter(role => !role.created_at).length ?? 0
  const customRoles = totalRoles - systemRoles

  return (
    <ContentLayout title="Papéis">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Papéis"
          description="Gerencie os papéis (roles) do Heimdall e as ações permitidas para cada um."
          breadcrumbs={[{ label: 'Papéis' }]}
          actions={
            <Button
              className="cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo papel
            </Button>
          }
        />

        <SummaryCards
          loading={isLoading}
          items={[
            {
              label: 'Total de papéis',
              value: totalRoles,
              icon: Shield,
              tone: 'gray',
            },
            {
              label: 'Papéis de sistema',
              value: systemRoles,
              icon: Settings2,
              tone: 'blue',
            },
            {
              label: 'Papéis personalizados',
              value: customRoles,
              icon: Wrench,
              tone: 'orange',
            },
          ]}
        />

        <RolesDataTable />

        <RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </ContentLayout>
  )
}
