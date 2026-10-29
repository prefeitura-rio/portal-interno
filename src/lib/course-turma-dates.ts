import { type RefinementCtx, z } from 'zod'

// As quatro datas de uma turma, na ordem em que precisam acontecer:
// Início das inscrições < Fim das inscrições < Início das aulas < Fim das aulas.
export const TURMA_DATE_FIELDS = [
  'enrollmentStartDate',
  'enrollmentEndDate',
  'classStartDate',
  'classEndDate',
] as const

export type TurmaDateField = (typeof TURMA_DATE_FIELDS)[number]

export type TurmaDates = Partial<Record<TurmaDateField, Date | null>>

export interface TurmaDateBound {
  field: TurmaDateField
  date: Date
}

export interface TurmaDateOrderViolation {
  field: TurmaDateField
  bound: TurmaDateField
  message: string
}

const FIELD_SUBJECT: Record<TurmaDateField, string> = {
  enrollmentStartDate: 'O início das inscrições',
  enrollmentEndDate: 'O fim das inscrições',
  classStartDate: 'O início das aulas',
  classEndDate: 'O fim das aulas',
}

const FIELD_REFERENCE: Record<TurmaDateField, string> = {
  enrollmentStartDate: 'ao início das inscrições',
  enrollmentEndDate: 'ao fim das inscrições',
  classStartDate: 'ao início das aulas',
  classEndDate: 'ao fim das aulas',
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

// Valor de uma data da turma que deixou de valer. Precisa ser `null`, não
// `undefined`: com `undefined`, o Controller do react-hook-form volta a mostrar
// o valor inicial do campo enquanto o formulário guarda a data vazia, e o
// rascunho seguia para a API sem a data.
export const CLEARED_TURMA_DATE = null

// Data da turma vinda da API. Vazio, inválido ou o zero do Go
// (0001-01-01T00:00:00Z, gravado quando a data não foi enviada) é ausência.
export function parseTurmaApiDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const date = new Date(value)
  if (!isValidDate(date) || date.getUTCFullYear() <= 1) return null
  return date
}

// Mensagem de data obrigatória que vale também para `null` (data limpa pelo
// encadeamento das datas da turma), não só para `undefined`.
export function requiredTurmaDateError(message: string) {
  return (issue: { input?: unknown }): string | undefined =>
    issue.input === undefined || issue.input === null ? message : undefined
}

// Limite exclusivo de `field`: a data preenchida mais próxima antes dele na
// ordem da turma. Uma data ausente (ex.: aulas de turma online sem datas) é
// pulada, e o campo seguinte é comparado com a anterior a ela.
export function turmaDateLowerBound(
  turma: TurmaDates,
  field: TurmaDateField
): TurmaDateBound | undefined {
  const index = TURMA_DATE_FIELDS.indexOf(field)
  for (let i = index - 1; i >= 0; i--) {
    const previous = TURMA_DATE_FIELDS[i]
    const date = turma[previous]
    if (isValidDate(date)) return { field: previous, date }
  }
  return undefined
}

// Mínimo exclusivo do calendário de `field` (a prop `after` do DateTimePicker).
export function turmaDateMin(
  turma: TurmaDates,
  field: TurmaDateField
): Date | undefined {
  return turmaDateLowerBound(turma, field)?.date
}

// Depois que `field` muda, as datas posteriores a ele que ficaram iguais ou
// anteriores ao novo limite deixam de valer: devolve quais limpar, na ordem.
// A restrição fica no calendário, que o usuário reabre com o mínimo
// recalculado, sem mensagem de erro.
export function turmaDatesToClear(
  turma: TurmaDates,
  field: TurmaDateField
): TurmaDateField[] {
  const working: TurmaDates = { ...turma }
  const cleared: TurmaDateField[] = []
  const start = TURMA_DATE_FIELDS.indexOf(field) + 1
  for (const later of TURMA_DATE_FIELDS.slice(start)) {
    const date = working[later]
    if (!isValidDate(date)) continue
    const bound = turmaDateLowerBound(working, later)
    if (bound && date.getTime() <= bound.date.getTime()) {
      working[later] = null
      cleared.push(later)
    }
  }
  return cleared
}

// Datas fora da ordem estrita, cada uma apontada no campo posterior do par.
export function turmaDateOrderViolations(
  turma: TurmaDates
): TurmaDateOrderViolation[] {
  const violations: TurmaDateOrderViolation[] = []
  for (const field of TURMA_DATE_FIELDS.slice(1)) {
    const date = turma[field]
    if (!isValidDate(date)) continue
    const bound = turmaDateLowerBound(turma, field)
    if (bound && date.getTime() <= bound.date.getTime()) {
      violations.push({
        field,
        bound: bound.field,
        message: `${FIELD_SUBJECT[field]} deve ser posterior ${FIELD_REFERENCE[bound.field]}.`,
      })
    }
  }
  return violations
}

const REQUIRED_MESSAGE: Record<TurmaDateField, string> = {
  enrollmentStartDate: 'Data de início das inscrições é obrigatória.',
  enrollmentEndDate: 'Data de fim das inscrições é obrigatória.',
  classStartDate: 'Data de início das aulas é obrigatória.',
  classEndDate: 'Data de fim das aulas é obrigatória.',
}

export const CLASS_DATES_PAIR_MESSAGE =
  'Preencha as duas datas de aula ou deixe ambas em branco.'

// O rascunho não pode seguir com uma data da turma vazia que a API gravaria
// como 0001-01-01: inscrições sempre; aulas sempre na turma presencial e, na
// online, as duas ou nenhuma.
export function refineTurmaDatesPresent(
  ctx: RefinementCtx,
  turma: TurmaDates,
  path: (string | number)[],
  classDates: 'required' | 'pair'
): void {
  const missing = (field: TurmaDateField) => !isValidDate(turma[field])
  const report = (field: TurmaDateField, message: string) =>
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: [...path, field],
    })
  for (const field of ['enrollmentStartDate', 'enrollmentEndDate'] as const) {
    if (missing(field)) report(field, REQUIRED_MESSAGE[field])
  }
  if (classDates === 'required') {
    for (const field of ['classStartDate', 'classEndDate'] as const) {
      if (missing(field)) report(field, REQUIRED_MESSAGE[field])
    }
  } else if (missing('classStartDate') !== missing('classEndDate')) {
    report('classEndDate', CLASS_DATES_PAIR_MESSAGE)
  }
}

// Trava do salvamento (rascunho e envio) para datas que não passaram pelo
// calendário, como as de uma turma salva antes desta regra.
export function refineTurmaDateOrder(
  ctx: RefinementCtx,
  turma: TurmaDates,
  path: (string | number)[]
): void {
  for (const violation of turmaDateOrderViolations(turma)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: violation.message,
      path: [...path, violation.field],
    })
  }
}
