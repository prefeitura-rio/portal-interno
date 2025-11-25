'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  FileSpreadsheet,
  Trash,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { type DragEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import type { SpreadsheetFormProps } from './types'
import {
  getScheduleOptions,
  hasMultipleSchedules,
} from './utils/schedule-helpers'
import { normalizeString } from './utils/string-utils'

interface ExpectedField {
  name: string
  required: boolean
}

/**
 * Form for adding participants via spreadsheet upload
 */
export function SpreadsheetForm({
  onBack,
  onFinish,
  courseId,
  courseData,
}: SpreadsheetFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validation, setValidation] = useState<
    Record<string, 'ok' | 'missing' | 'optional'>
  >({})
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [copiedScheduleId, setCopiedScheduleId] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const expectedFields: ExpectedField[] = [
    { name: 'nome_completo', required: true },
    { name: 'cpf', required: true },
    { name: 'idade', required: false },
    { name: 'telefone', required: false },
    { name: 'email', required: true },
    { name: 'endereco', required: false },
    { name: 'bairro', required: false },
  ]

  const course = courseData

  if (course?.custom_fields && course.custom_fields.length > 0) {
    for (const field of course.custom_fields) {
      expectedFields.push({
        name: field.title! || field.name!,
        required: field.required,
      })
    }
  }

  // Check if course has multiple schedules and add Turma field
  const requiresScheduleSelection = useMemo(
    () => hasMultipleSchedules(courseData),
    [courseData]
  )

  const scheduleOptions = useMemo(
    () => getScheduleOptions(courseData),
    [courseData]
  )

  if (requiresScheduleSelection) {
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

    // Normalize header row - remove accents and lowercase
    const headerRow = rows[0]?.map(cell => normalizeString(String(cell)))

    if (!headerRow || headerRow.length === 0) {
      setError('Não foi possível ler o cabeçalho da planilha.')
      return
    }

    const status: Record<string, 'ok' | 'missing' | 'optional'> = {}
    const missing: string[] = []

    for (const field of expectedFields) {
      // Normalize expected field name as well
      const fieldNameNormalized = normalizeString(field.name)
      const found = headerRow.some(col => col === fieldNameNormalized)

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

  const handleCopyScheduleId = async (scheduleId: string) => {
    try {
      await navigator.clipboard.writeText(scheduleId)
      setCopiedScheduleId(scheduleId)
      toast.success('Copiado!')

      // Reset the check icon after 2 seconds
      setTimeout(() => {
        setCopiedScheduleId(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Erro ao copiar')
    }
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
            'border-green-400 hover:border-green-500 bg-green-50/20':
              file && !error,
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
                <span className="text-primary font-medium">
                  Solte o arquivo aqui
                </span>
              ) : (
                <>
                  Arraste o arquivo aqui ou{' '}
                  <span className="text-primary font-medium">
                    clique para selecionar
                  </span>
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
                onClick={e => {
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

      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          Campos esperados para inscrição deste curso:
        </h3>

        {/* Grid de campos esperados - 2 colunas */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {expectedFields
            .filter(field => field.name !== 'Turma')
            .map(field => {
              const status = validation[field.name]
              const isOk = status === 'ok'
              const isMissing = status === 'missing'

              return (
                <div
                  key={field.name}
                  className="flex items-center text-sm gap-2"
                >
                  {isOk ? (
                    <Check className="text-green-500 h-4 w-4 flex-shrink-0" />
                  ) : isMissing ? (
                    <X className="text-red-500 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <div className="h-2 w-2 rounded-full border border-zinc-400 flex-shrink-0" />
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
                </div>
              )
            })}
        </div>

        {/* Tabela de turmas disponíveis */}
        {requiresScheduleSelection && (
          <div className="space-y-2 mt-6">
            <div className="flex items-center text-sm gap-2">
              {validation.Turma === 'ok' ? (
                <Check className="text-green-500 h-4 w-4" />
              ) : validation.Turma === 'missing' ? (
                <X className="text-red-500 h-4 w-4" />
              ) : (
                <div className="h-2 w-2 rounded-full border border-zinc-400" />
              )}
              <span
                className={cn({
                  'text-red-600': validation.Turma === 'missing',
                  'text-green-600': validation.Turma === 'ok',
                  'text-muted-foreground':
                    validation.Turma !== 'ok' && validation.Turma !== 'missing',
                })}
              >
                Turma*
              </span>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Turma</TableHead>
                    <TableHead className="font-semibold w-[280px]">
                      UUID/ID
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleOptions.map(option => (
                    <TableRow key={option.id}>
                      <TableCell className="text-sm">{option.label}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {option.id}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyScheduleId(option.id)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedScheduleId === option.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground italic mt-2">
              Utilize o UUID/ID da turma no campo de Turma na planilha.
            </p>
          </div>
        )}

        {/* Resumo de validação */}
        {file && (
          <div className="text-sm mt-3">
            {missingFields.length === 0 ? (
              <p className="text-green-600">
                ✅ Todos os campos obrigatórios estão presentes.
              </p>
            ) : (
              <p className="text-red-600">
                ⚠️ Os campos obrigatórios ausentes: {missingFields.join(', ')}.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          variant="ghost"
          type="button"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          // disabled={!file || !!error || missingFields.length > 0 || isUploading}
          className="gap-2"
          onClick={async () => {
            if (!file) return

            setIsUploading(true)
            try {
              const formData = new FormData()
              formData.append('file', file)

              const response = await fetch(
                `/api/enrollments/${courseId}/import`,
                {
                  method: 'POST',
                  body: formData,
                }
              )

              if (response.ok) {
                onFinish(true)
              } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Erro ao enviar planilha')
              }
            } catch (error) {
              console.error('Erro ao enviar planilha:', error)
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Erro ao enviar planilha. Tente novamente.'
              )
              onFinish(false)
            } finally {
              setIsUploading(false)
            }
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {isUploading ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </div>
  )
}
