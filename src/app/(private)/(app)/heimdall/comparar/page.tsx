'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import type { HeimdallCompareResult } from '@/lib/heimdall-compare'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import {
  useHeimdallCompare,
  useHeimdallCompareConfig,
} from '../hooks/use-heimdall-compare'
import { CompareForm } from './components/compare-form'
import { CompareResults } from './components/compare-results'

export default function HeimdallCompararPage() {
  const { data: config } = useHeimdallCompareConfig()
  const compareMutation = useHeimdallCompare()

  const [compareBaseUrl, setCompareBaseUrl] = useState('')
  const [compareJwt, setCompareJwt] = useState('')
  const [result, setResult] = useState<HeimdallCompareResult | null>(null)

  useEffect(() => {
    if (!config) return
    if (!compareBaseUrl) {
      setCompareBaseUrl(config.suggestedCompareBaseUrl)
    }
  }, [config, compareBaseUrl])

  async function handleCompare() {
    try {
      const data = await compareMutation.mutateAsync({
        compareBaseUrl,
        compareJwt,
      })
      setResult(data)
      toast.success('Comparação concluída')
    } catch (error) {
      setResult(null)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao comparar ambientes'
      )
    }
  }

  return (
    <ContentLayout title="Comparar ambientes">
      <div className="space-y-6">
        <HeimdallPageHeader
          title="Comparar ambientes - Para devs"
          description="Compara mappings, actions, papéis e grupos entre staging e produção. Cole o JWT do outro ambiente para autenticar a consulta remota."
          breadcrumbs={[{ label: 'Comparar ambientes' }]}
        />

        <CompareForm
          config={config}
          compareBaseUrl={compareBaseUrl}
          compareJwt={compareJwt}
          isLoading={compareMutation.isPending}
          onCompareBaseUrlChange={setCompareBaseUrl}
          onCompareJwtChange={setCompareJwt}
          onSubmit={handleCompare}
        />

        {result ? <CompareResults result={result} /> : null}
      </div>
    </ContentLayout>
  )
}
