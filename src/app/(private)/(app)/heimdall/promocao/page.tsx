'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Suspense } from 'react'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { PromotionReview } from './components/promotion-review'

export default function HeimdallPromocaoPage() {
  return (
    <ContentLayout title="Promover configuração do release">
      <div className="space-y-6">
        <HeimdallPageHeader
          title="Promover configuração do release"
          description="Itens do Heimdall que o release precisa em produção e que já existem em staging. Revise, desmarque o que não quiser e aprove."
          breadcrumbs={[{ label: 'Promover configuração do release' }]}
        />
        {/* useSearchParams no componente exige um Suspense acima */}
        <Suspense>
          <PromotionReview />
        </Suspense>
      </div>
    </ContentLayout>
  )
}
