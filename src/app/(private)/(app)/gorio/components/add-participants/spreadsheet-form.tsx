'use client'

import { Button } from '@/components/ui/button'
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
  onStartProcessing,
  onProcessingComplete,
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
    { name: 'email', required: false },
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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const uploaded = e.dataTransfer.files?.[0]
    if (uploaded) validateFile(uploaded)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
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
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl transition-all duration-200 select-none',
          {
            'border-primary bg-primary/10': isDragging,
            'border-red-400 hover:border-red-500 bg-red-50/20': error,
            'border-green-400 bg-green-50/20': file && !error,
            'border-zinc-300 hover:border-primary/40 bg-zinc-50/50 dark:bg-zinc-900/40':
              !file && !error && !isDragging,
          }
        )}
      >
        {!file && (
          <label
            htmlFor="spreadsheet-upload"
            className="absolute inset-0 cursor-pointer"
          >
            <input
              id="spreadsheet-upload"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        )}

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
          <div className="pointer-events-none flex flex-col items-center gap-2 text-green-600">
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
                  e.preventDefault()
                  e.stopPropagation()
                  removeFile()
                }}
                className="pointer-events-auto p-1 rounded-md text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors"
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
      </div>

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

            <div className="space-y-3">
              {scheduleOptions.map(option => (
                <div
                  key={option.id}
                  className="flex items-stretch gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium leading-relaxed break-words">
                      {option.label}
                    </p>

                    <p className="font-mono text-xs text-muted-foreground">
                      {option.id.slice(0, 8)}...
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyScheduleId(option.id)}
                    className="self-stretch min-w-[110px] flex items-center justify-center gap-2"
                  >
                    {copiedScheduleId === option.id ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar ID</span>
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic mt-2">
              Utilize o UUID/ID da turma no campo de Turma na planilha.
            </p>
          </div>
        )}

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

              // Step 1: Upload the file
              const uploadResponse = await fetch(
                `/api/enrollments/${courseId}/import`,
                {
                  method: 'POST',
                  body: formData,
                }
              )

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json()
                throw new Error(errorData.error || 'Erro ao enviar planilha')
              }

              const uploadData = await uploadResponse.json()
              console.log('Upload response:', uploadData)

              // Step 2: Extract job_id from the response
              const jobId = uploadData?.data?.job_id

              if (!jobId) {
                throw new Error('Job ID não retornado pela API')
              }

              console.log('Job ID:', jobId)

              // Step 3: Transition to processing step
              onStartProcessing()

              // Step 4: Poll job status until completion
              let jobCompleted = false
              let finalStatusData = null
              const maxAttempts = 10
              let attempts = 0

              while (!jobCompleted && attempts < maxAttempts) {
                attempts++

                await new Promise(resolve => setTimeout(resolve, 1000))

                const statusResponse = await fetch(`/api/jobs/${jobId}/status`)

                if (!statusResponse.ok) {
                  console.error('Erro ao verificar status do job')
                  continue
                }

                const statusData = await statusResponse.json()
                console.log(`Job status (attempt ${attempts}):`, statusData)

                const jobData = statusData?.data || statusData
                const status = jobData?.status

                if (status === 'completed') {
                  jobCompleted = true
                  finalStatusData = jobData
                  console.log('Job completed!', JSON.stringify(jobData))
                  break // Exit loop
                }

                if (status === 'failed') {
                  jobCompleted = true
                  finalStatusData = jobData
                  console.log('Job failed!', JSON.stringify(jobData))
                  break // Exit loop
                }

                if (status === 'processing' || status === 'pending') {
                  console.log(
                    `Job still ${status}... Progress: ${jobData?.progress || 0}%`
                  )
                }
              }

              if (!jobCompleted) {
                throw new Error('Timeout ao processar planilha')
              }

              // Step 5: Show results
              if (finalStatusData) {
                onProcessingComplete({
                  success_count: finalStatusData.success_count || 0,
                  error_count: finalStatusData.error_count || 0,
                  duplicate_count: finalStatusData.result?.duplicate_count || 0,
                  total_records: finalStatusData.total_records || 0,
                  errors: finalStatusData.errors || [],
                })
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
