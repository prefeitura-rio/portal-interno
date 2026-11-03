/**
 * Resumo de um job de importação (ex.: inscrições por planilha) seguro para
 * log.
 *
 * O job do backend traz em `errors[].data` a linha original da planilha (CPF,
 * nome, telefone, e-mail e endereço do cidadão) e em `result`/`metadata`
 * dados livres. Nada disso pode ir para o log do servidor nem para o console
 * do navegador: o resumo guarda só o identificador, o status, o progresso e
 * as contagens, e descarta qualquer valor com tipo inesperado.
 */

export interface ImportJobLogSummary {
  id?: string
  status?: string
  progress?: number
  total_records?: number
  success_count?: number
  error_count?: number
}

const STRING_FIELDS = ['id', 'status'] as const
const NUMBER_FIELDS = [
  'progress',
  'total_records',
  'success_count',
  'error_count',
] as const

/** Identificador ou status curto, sem espaço: nunca uma linha de planilha. */
const SAFE_TOKEN = /^[\w.:-]{1,64}$/

export function summarizeImportJobForLog(job: unknown): ImportJobLogSummary {
  if (typeof job !== 'object' || job === null || Array.isArray(job)) {
    return {}
  }

  const source = job as Record<string, unknown>
  const summary: ImportJobLogSummary = {}

  for (const field of STRING_FIELDS) {
    const value = source[field]
    if (typeof value === 'string' && SAFE_TOKEN.test(value)) {
      summary[field] = value
    }
  }

  for (const field of NUMBER_FIELDS) {
    const value = source[field]
    if (typeof value === 'number' && Number.isFinite(value)) {
      summary[field] = value
    }
  }

  return summary
}
