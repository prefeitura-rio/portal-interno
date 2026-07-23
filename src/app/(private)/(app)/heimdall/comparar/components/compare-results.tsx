'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  HeimdallCompareResult,
  StatusCounts,
} from '@/lib/heimdall-compare'
import {
  AlertTriangle,
  CheckCircle2,
  CircleMinus,
  GitCompareArrows,
} from 'lucide-react'
import { SummaryCards } from '../../components/summary-cards'
import { CompareActionItems } from './compare-action-items'
import { MappingsCompareTable, SetCompareTable } from './compare-tables'

function dimensionTotals(counts: StatusCounts) {
  return {
    mismatch: counts.MISMATCH,
    onlyProd: counts.ONLY_PROD,
    onlyStaging: counts.ONLY_STAGING,
    match: counts.MATCH,
  }
}

function aggregateCounts(result: HeimdallCompareResult): StatusCounts {
  const dims = [
    result.dimensions.mappings.counts,
    result.dimensions.actions.counts,
    result.dimensions.roles.counts,
    result.dimensions.groups.counts,
  ]
  return dims.reduce(
    (acc, c) => ({
      MATCH: acc.MATCH + c.MATCH,
      MISMATCH: acc.MISMATCH + c.MISMATCH,
      ONLY_PROD: acc.ONLY_PROD + c.ONLY_PROD,
      ONLY_STAGING: acc.ONLY_STAGING + c.ONLY_STAGING,
    }),
    { MATCH: 0, MISMATCH: 0, ONLY_PROD: 0, ONLY_STAGING: 0 }
  )
}

function tabLabel(name: string, counts: StatusCounts) {
  const divergences = counts.MISMATCH + counts.ONLY_PROD + counts.ONLY_STAGING
  return divergences > 0 ? `${name} (${divergences})` : name
}

export function CompareResults({ result }: { result: HeimdallCompareResult }) {
  const totals = aggregateCounts(result)
  const summary = dimensionTotals(totals)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Gerado em{' '}
          <time dateTime={result.generatedAt}>
            {new Date(result.generatedAt).toLocaleString('pt-BR')}
          </time>
        </p>
        <p>
          Produção: <code className="text-xs">{result.prodBaseUrl}</code>
        </p>
        <p>
          Staging: <code className="text-xs">{result.stagingBaseUrl}</code>
        </p>
      </div>

      <SummaryCards
        items={[
          {
            label: 'MISMATCH',
            value: summary.mismatch,
            icon: AlertTriangle,
            tone: 'red',
          },
          {
            label: 'ONLY_PROD',
            value: summary.onlyProd,
            icon: CircleMinus,
            tone: 'orange',
          },
          {
            label: 'ONLY_STAGING',
            value: summary.onlyStaging,
            icon: GitCompareArrows,
            tone: 'yellow',
          },
          {
            label: 'MATCH',
            value: summary.match,
            icon: CheckCircle2,
            tone: 'green',
          },
        ]}
      />

      <CompareActionItems items={result.actionItems} />

      <Tabs defaultValue="mappings">
        <TabsList>
          <TabsTrigger value="mappings">
            {tabLabel('Mapeamentos', result.dimensions.mappings.counts)}
          </TabsTrigger>
          <TabsTrigger value="actions">
            {tabLabel('Ações', result.dimensions.actions.counts)}
          </TabsTrigger>
          <TabsTrigger value="roles">
            {tabLabel('Papéis', result.dimensions.roles.counts)}
          </TabsTrigger>
          <TabsTrigger value="groups">
            {tabLabel('Grupos', result.dimensions.groups.counts)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="mt-4">
          <MappingsCompareTable rows={result.dimensions.mappings.rows} />
        </TabsContent>
        <TabsContent value="actions" className="mt-4">
          <SetCompareTable
            rows={result.dimensions.actions.rows}
            nameHeader="action"
            itemsHeader="mappings"
          />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <SetCompareTable
            rows={result.dimensions.roles.rows}
            nameHeader="papel"
            itemsHeader="actions"
          />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <SetCompareTable
            rows={result.dimensions.groups.rows}
            nameHeader="grupo"
            itemsHeader="papéis"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
