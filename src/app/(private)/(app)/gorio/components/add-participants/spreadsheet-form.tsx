'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, CheckCircle, FileSpreadsheet, Trash, Upload, XCircle } from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'

interface SpreadsheetFormProps {
  onBack: () => void
  onFinish: (success: boolean) => void
}

export function SpreadsheetForm({ onBack, onFinish }: SpreadsheetFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const validateFile = (uploaded: File) => {
    if (
      ![
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ].includes(uploaded.type)
    ) {
      setError('Formato inválido. Use .csv ou .xlsx.')
      setFile(null)
      return false
    }

    if (uploaded.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.')
      setFile(null)
      return false
    }

    setError(null)
    setFile(uploaded)
    return true
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0]
    if (uploaded) validateFile(uploaded)
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const uploaded = e.dataTransfer.files?.[0]
    if (uploaded) validateFile(uploaded)
  }

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Faça upload de um arquivo CSV ou XLSX contendo os participantes.
        </p>
      </div>

      <label
        htmlFor="spreadsheet-upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 select-none',
          {
            'border-primary bg-primary/10': isDragging,
            'border-red-400 hover:border-red-500 bg-red-50/20': error,
            'border-green-400 hover:border-green-500 bg-green-50/20': file && !error,
            'border-zinc-300 hover:border-primary/40 bg-zinc-50/50 dark:bg-zinc-900/40':
              !file && !error && !isDragging,
          }
        )}
      >
        <input
          id="spreadsheet-upload"
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFile}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        {!file && !error && (
          <div
            className="pointer-events-none flex flex-col items-center text-center text-muted-foreground"
          >
            <Upload className="h-8 w-8 mb-2 text-zinc-500" />
            <p className="text-sm">
              {isDragging ? (
                <span className="text-primary font-medium">Solte o arquivo aqui</span>
              ) : (
                <>
                  Arraste o arquivo aqui ou{' '}
                  <span className="text-primary font-medium">clique para selecionar</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: .csv, .xlsx — até 10MB
            </p>
          </div>
        )}

        {/* Sucesso */}
        {file && !error && (
          <div className="flex flex-col items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <div className="flex items-center justify-between w-full max-w-sm px-3 py-2 rounded-md bg-green-100/40 dark:bg-green-900/20 border border-green-400/30">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400 truncate max-w-[180px]">
                    {file.name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile()
                }}
                className="p-1 rounded-md text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
                title="Remover arquivo"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </label>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          disabled={!file || !!error}
          className="gap-2"
          onClick={async () => {
            if (!file) return
            try {
              onFinish(true)
            } catch {
              onFinish(false)
            }
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Enviar
        </Button>
      </div>
    </div>
  )
}
