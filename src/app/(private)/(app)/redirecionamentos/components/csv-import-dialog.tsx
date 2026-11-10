'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ModelsImportResult } from '@/http-redirecionamentos/models'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Trash,
  Upload,
  XCircle,
} from 'lucide-react'
import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useImportRedirects } from '../hooks/use-redirects'
import { generateCsvTemplate } from '../lib/redirects-utils'
import { CsvImportReport } from './csv-import-report'

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VALID_CSV_TYPES = ['text/csv', 'application/vnd.ms-excel']
const MAX_CSV_SIZE = 5 * 1024 * 1024

function downloadCsvTemplateFile() {
  const blob = new Blob([generateCsvTemplate()], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: 'modelo-redirecionamentos.csv',
  })
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [report, setReport] = useState<ModelsImportResult | null>(null)
  const dragCounter = useRef(0)
  const importRedirects = useImportRedirects()

  const resetState = useCallback(() => {
    setFile(null)
    setError(null)
    setIsDragging(false)
    setReport(null)
    dragCounter.current = 0
  }, [])

  useEffect(() => {
    if (!open) resetState()
  }, [open, resetState])

  const validateAndSelectFile = (uploaded: File) => {
    if (!VALID_CSV_TYPES.includes(uploaded.type)) {
      resetState()
      setError('Tipo de arquivo inválido. Use um arquivo .csv.')
      return
    }
    if (uploaded.size > MAX_CSV_SIZE) {
      resetState()
      setError('Arquivo muito grande. O tamanho máximo é 5MB.')
      return
    }
    setError(null)
    setFile(uploaded)
    setReport(null)
    importRedirects.mutate(
      { file: uploaded, dryRun: true },
      {
        onSuccess: data => setReport(data),
        onError: err => setError(err.message),
      }
    )
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const uploaded = e.dataTransfer.files?.[0]
    if (uploaded) validateAndSelectFile(uploaded)
  }

  const reportErrors = report?.errors ?? []
  const canImport =
    !!file &&
    !error &&
    !!report &&
    reportErrors.length === 0 &&
    !importRedirects.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV (até 5 MB) para validar e importar regras de
            redirecionamento em lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              host,path,match_type,destination,status_code,enabled,notes
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={downloadCsvTemplateFile}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Baixar modelo CSV
            </Button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={e => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDragEnter={e => {
              e.preventDefault()
              e.stopPropagation()
              dragCounter.current += 1
              setIsDragging(true)
            }}
            onDragLeave={e => {
              e.preventDefault()
              e.stopPropagation()
              dragCounter.current -= 1
              if (dragCounter.current === 0) setIsDragging(false)
            }}
            className={cn(
              'relative flex h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 select-none',
              {
                'border-primary bg-primary/10': isDragging,
                'border-destructive bg-destructive/10': !!error,
                'border-border bg-muted/40': !file && !error && !isDragging,
                'border-primary/40 bg-muted/20': !!file && !error,
              }
            )}
          >
            {!file && (
              <label
                htmlFor="redirects-csv-upload"
                className="absolute inset-0 cursor-pointer"
              >
                <input
                  id="redirects-csv-upload"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => {
                    const uploaded = e.target.files?.[0]
                    if (uploaded) validateAndSelectFile(uploaded)
                  }}
                  className="hidden"
                />
              </label>
            )}

            {!file && !error && (
              <div className="pointer-events-none flex flex-col items-center text-center text-muted-foreground">
                <Upload className="mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm">
                  Arraste o arquivo CSV aqui ou{' '}
                  <span className="font-medium text-primary">
                    clique para selecionar
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Formato aceito: .csv — até 5MB
                </p>
              </div>
            )}

            {file && !error && (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="max-w-[220px] truncate text-sm font-medium">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={resetState}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                    title="Remover arquivo"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-2 px-4 text-center text-destructive">
                <XCircle className="h-6 w-6" />
                <p className="text-sm font-medium">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                >
                  Selecionar outro arquivo
                </Button>
              </div>
            )}
          </div>

          {importRedirects.isPending && !report && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando arquivo CSV...
            </div>
          )}

          {report && <CsvImportReport report={report} />}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canImport}
            onClick={() =>
              file &&
              importRedirects.mutate(
                { file, dryRun: false },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            {importRedirects.isPending && report && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
