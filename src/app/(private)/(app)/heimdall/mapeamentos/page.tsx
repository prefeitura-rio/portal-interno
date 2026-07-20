'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { MappingsDataTable } from './components/mappings-data-table'

export default function HeimdallMapeamentosPage() {
  return (
    <ContentLayout title="Mapeamentos">
      <div className="space-y-4">
        <HeimdallPageHeader
          title="Mapeamentos"
          description="Gerencie os mapeamentos de endpoints para ações de autorização e teste a resolução de rotas."
          breadcrumbs={[{ label: 'Mapeamentos' }]}
        />
        <MappingsDataTable />
      </div>
    </ContentLayout>
  )
}
