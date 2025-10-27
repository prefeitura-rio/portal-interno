'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  FileSpreadsheet,
  Trash,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

interface SpreadsheetFormProps {
  onBack: () => void
  onFinish: (success: boolean) => void
  courseData: any
}

interface ExpectedField {
  name: string
  required: boolean
}

export function SpreadsheetForm({ onBack, onFinish, courseData }: SpreadsheetFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validation, setValidation] = useState<Record<string, 'ok' | 'missing' | 'optional'>>({})
  const [missingFields, setMissingFields] = useState<string[]>([])
  const dragCounter = useRef(0)

  const expectedFields: ExpectedField[] = [
    { name: 'Nome', required: true },
    { name: 'CPF', required: true },
    { name: 'Idade', required: true },
  ]

  const course = courseData
  if (course?.custom_fields?.length > 0) {
    for (const field of course.custom_fields) {
      expectedFields.push({
        name: field.title,
        required: field.required,
      })
    }
  }

  if (course?.locations?.length > 1) {
    expectedFields.push({ name: 'Turma', required: true })
  }

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
    handleReadFile(uploaded)
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
    setValidation({})
    setMissingFields([])
  }

  const handleReadFile = async (uploaded: File) => {
    const data = await uploaded.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    const headerRow = rows[0]?.map((cell) => String(cell).trim().toLowerCase())

    if (!headerRow || headerRow.length === 0) {
      setError('Não foi possível ler o cabeçalho da planilha.')
      return
    }

    const status: Record<string, 'ok' | 'missing' | 'optional'> = {}
    const missing: string[] = []

    for (const field of expectedFields) {
      const found = headerRow.some(
        (col) => col === field.name.toLowerCase().trim()
      )
      if (found) {
        status[field.name] = 'ok'
      } else if (field.required) {
        status[field.name] = 'missing'
        missing.push(field.name)
      } else {
        status[field.name] = 'optional'
      }
    }

    setValidation(status)
    setMissingFields(missing)
  }

  return (
    <div className="space-y-6">
      {/* Instruções */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Faça upload de um arquivo CSV ou XLSX contendo os participantes.
        </p>
      </div>

      {/* Área de upload */}
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
          <div className="pointer-events-none flex flex-col items-center text-center text-muted-foreground">
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

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Campos esperados para inscrição deste curso:</h3>
        <ul className="space-y-1">
          {expectedFields.map((field) => {
            const status = validation[field.name]
            const isOk = status === 'ok'
            const isMissing = status === 'missing'

            return (
              <li
                key={field.name}
                className="flex items-center text-sm gap-2"
              >
                {isOk ? (
                  <Check className="text-green-500 h-4 w-4" />
                ) : isMissing ? (
                  <X className="text-red-500 h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-zinc-400" />
                )}
                <span
                  className={cn({
                    'text-red-600': isMissing,
                    'text-green-600': isOk,
                    'text-muted-foreground': !isOk && !isMissing,
                  })}
                >
                  {field.name}
                  {field.required ? '*' : ' (opcional)'}
                </span>
              </li>
            )
          })}
        </ul>

        {/* Resumo de validação */}
        {file && (
          <div className="text-sm mt-3">
            {missingFields.length === 0 ? (
              <p className="text-green-600">✅ Todos os campos obrigatórios estão presentes.</p>
            ) : (
              <p className="text-red-600">
                ⚠️ Os campos obrigatórios ausentes: {missingFields.join(', ')}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" type="button" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          disabled={!file || !!error || missingFields.length > 0}
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
