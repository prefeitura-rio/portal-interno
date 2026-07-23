'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MappingCompareRow, SetCompareRow } from '@/lib/heimdall-compare'
import { useMemo, useState } from 'react'
import { CompareStatusBadge } from './compare-status-badge'

interface DivergenceFilterProps {
  onlyDivergences: boolean
  onOnlyDivergencesChange: (value: boolean) => void
}

function DivergenceFilter({
  onlyDivergences,
  onOnlyDivergencesChange,
}: DivergenceFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="only-divergences"
        checked={onlyDivergences}
        onCheckedChange={onOnlyDivergencesChange}
      />
      <Label htmlFor="only-divergences" className="text-sm font-normal">
        Só divergências
      </Label>
    </div>
  )
}

export function MappingsCompareTable({ rows }: { rows: MappingCompareRow[] }) {
  const [onlyDivergences, setOnlyDivergences] = useState(true)
  const filtered = useMemo(
    () => (onlyDivergences ? rows.filter(r => r.status !== 'MATCH') : rows),
    [rows, onlyDivergences]
  )

  return (
    <div className="space-y-3">
      <DivergenceFilter
        onlyDivergences={onlyDivergences}
        onOnlyDivergencesChange={setOnlyDivergences}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>path_pattern</TableHead>
            <TableHead>method</TableHead>
            <TableHead>prod action</TableHead>
            <TableHead>staging action</TableHead>
            <TableHead>status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Nenhum item para exibir.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(row => (
              <TableRow key={`${row.method}-${row.pathPattern}`}>
                <TableCell className="max-w-md break-all font-mono text-xs">
                  {row.pathPattern}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.method}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.prodAction || '—'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.stagingAction || '—'}
                </TableCell>
                <TableCell>
                  <CompareStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

interface SetCompareTableProps {
  rows: SetCompareRow[]
  nameHeader: string
  itemsHeader: string
}

export function SetCompareTable({
  rows,
  nameHeader,
  itemsHeader,
}: SetCompareTableProps) {
  const [onlyDivergences, setOnlyDivergences] = useState(true)
  const filtered = useMemo(
    () => (onlyDivergences ? rows.filter(r => r.status !== 'MATCH') : rows),
    [rows, onlyDivergences]
  )

  return (
    <div className="space-y-3">
      <DivergenceFilter
        onlyDivergences={onlyDivergences}
        onOnlyDivergencesChange={setOnlyDivergences}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{nameHeader}</TableHead>
            <TableHead>{itemsHeader} em prod</TableHead>
            <TableHead>{itemsHeader} em staging</TableHead>
            <TableHead>status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Nenhum item para exibir.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(row => (
              <TableRow key={row.name}>
                <TableCell className="font-mono text-xs">{row.name}</TableCell>
                <TableCell>{row.prodItems.length}</TableCell>
                <TableCell>{row.stagingItems.length}</TableCell>
                <TableCell>
                  <CompareStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {filtered
        .filter(r => r.status === 'MISMATCH')
        .map(row => (
          <div
            key={`detail-${row.name}`}
            className="rounded-md border bg-muted/30 p-3 text-xs"
          >
            <p className="mb-2 font-mono font-medium">{row.name}</p>
            {row.onlyProd.length > 0 ? (
              <p className="text-muted-foreground">
                Só em produção:{' '}
                <span className="font-mono text-foreground">
                  {row.onlyProd.join(', ')}
                </span>
              </p>
            ) : null}
            {row.onlyStaging.length > 0 ? (
              <p className="text-muted-foreground">
                Só em staging:{' '}
                <span className="font-mono text-foreground">
                  {row.onlyStaging.join(', ')}
                </span>
              </p>
            ) : null}
          </div>
        ))}
    </div>
  )
}
