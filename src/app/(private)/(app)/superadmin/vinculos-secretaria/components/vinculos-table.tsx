'use client'

import { DepartmentName } from '@/components/ui/department-name'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ModelsCPFSecretariaResponse } from '@/http-rmi/models/modelsCPFSecretariaResponse'
import type { ReactNode } from 'react'

function formatDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR')
}

interface VinculosTableProps {
  mappings: ModelsCPFSecretariaResponse[]
  emptyMessage?: string
  renderActions?: (mapping: ModelsCPFSecretariaResponse) => ReactNode
}

export function VinculosTable({
  mappings,
  emptyMessage = 'Nenhum vínculo encontrado para este CPF.',
  renderActions,
}: VinculosTableProps) {
  if (mappings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border rounded-md">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Secretaria (cd_ua)</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Criado por</TableHead>
            {renderActions ? (
              <TableHead className="w-[120px]">Ações</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map(mapping => (
            <TableRow key={mapping.id ?? `${mapping.cpf}-${mapping.cd_ua}`}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <DepartmentName cd_ua={mapping.cd_ua} />
                  <span className="text-xs text-muted-foreground font-mono">
                    {mapping.cd_ua ?? '—'}
                  </span>
                </div>
              </TableCell>
              <TableCell>{formatDateTime(mapping.created_at)}</TableCell>
              <TableCell className="font-mono text-sm">
                {mapping.created_by ?? '—'}
              </TableCell>
              {renderActions ? (
                <TableCell>{renderActions(mapping)}</TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
