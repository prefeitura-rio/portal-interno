'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Button } from '@/components/ui/button'
import { Link2, Link2Off, Plus, Zap } from 'lucide-react'
import * as React from 'react'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { SummaryCards } from '../components/summary-cards'
import { useAllHeimdallActions } from '../hooks/use-heimdall-actions'
import { ActionFormDialog } from './components/action-form-dialog'
import { ActionsDataTable } from './components/actions-data-table'

export default function HeimdallAcoesPage() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const { data: allActions, isLoading } = useAllHeimdallActions()

  const totalActions = allActions?.length ?? 0
  const mappedActions =
    allActions?.filter(action => (action.endpoint_count ?? 0) > 0).length ?? 0
  const unmappedActions = totalActions - mappedActions

  return (
    <ContentLayout title="Ações">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Ações"
          description="Gerencie as ações (permissões) do Heimdall que podem ser atribuídas a papéis e mapeadas a endpoints."
          breadcrumbs={[{ label: 'Ações' }]}
          actions={
            <Button
              className="cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova ação
            </Button>
          }
        />

        <SummaryCards
          loading={isLoading}
          items={[
            {
              label: 'Total de ações',
              value: totalActions,
              icon: Zap,
              tone: 'gray',
            },
            {
              label: 'Ações mapeadas',
              value: mappedActions,
              icon: Link2,
              tone: 'green',
            },
            {
              label: 'Ações não mapeadas',
              value: unmappedActions,
              icon: Link2Off,
              tone: 'yellow',
            },
          ]}
        />

        <ActionsDataTable />

        <ActionFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          action={null}
        />
      </div>
    </ContentLayout>
  )
}
