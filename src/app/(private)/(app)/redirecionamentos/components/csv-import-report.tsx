'use client'

import type { ModelsImportResult } from '@/http-redirecionamentos/models'

interface CsvImportReportProps {
  report: ModelsImportResult
}

export function CsvImportReport({ report }: CsvImportReportProps) {
  const reportErrors = report.errors ?? []

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-base font-semibold">{report.total ?? 0}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Criadas</p>
          <p className="text-base font-semibold">{report.created ?? 0}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Atualizadas</p>
          <p className="text-base font-semibold">{report.updated ?? 0}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">Erros</p>
          <p className="text-base font-semibold text-destructive">
            {reportErrors.length}
          </p>
        </div>
      </div>

      {reportErrors.length > 0 && (
        <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
          <p className="text-xs font-semibold text-destructive">
            Corrija os erros abaixo antes de importar:
          </p>
          {reportErrors.map((err, index) => (
            <div
              key={`${err.line ?? index}-${err.column ?? ''}`}
              className="text-xs text-destructive"
            >
              <span className="font-mono font-medium">
                Linha {err.line ?? '—'}
                {err.column ? ` (${err.column})` : ''}:
              </span>{' '}
              {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
