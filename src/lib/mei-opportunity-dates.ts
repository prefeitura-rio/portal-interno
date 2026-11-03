import { type RefinementCtx, z } from 'zod'

export const EXECUTION_BEFORE_EXPIRATION_MESSAGE =
  'A data limite para execução não pode ser anterior ao prazo de expiração da oportunidade.'

export const SERVICE_EXECUTION_DEADLINE_REQUIRED_MESSAGE =
  'Data limite para execução do serviço é obrigatória.'

export const EXPIRATION_NOT_IN_FUTURE_MESSAGE =
  'O prazo para expiração da oportunidade deve ser posterior ao momento atual.'

export interface MEIOpportunityDeadlines {
  opportunity_expiration_date?: Date | null
  service_execution_deadline?: Date | null
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

// A data limite para execução do serviço precisa ser igual ou posterior ao
// prazo de expiração da oportunidade: antes disso, as propostas recebidas já
// nasceriam vencidas. Sem uma das duas datas, não há o que comparar.
export function isExecutionDeadlineBeforeExpiration(
  dates: MEIOpportunityDeadlines
): boolean {
  const { opportunity_expiration_date, service_execution_deadline } = dates
  if (
    !isValidDate(opportunity_expiration_date) ||
    !isValidDate(service_execution_deadline)
  )
    return false
  return (
    service_execution_deadline.getTime() < opportunity_expiration_date.getTime()
  )
}

// DEV-164: uma oportunidade nova não pode nascer vencida. O prazo de expiração
// precisa ser estritamente posterior a `now`; a data limite de execução, que
// não pode ser anterior a ele, fica no futuro por consequência. Sem prazo (ou
// com data inválida), a obrigatoriedade do campo é que responde.
export function isExpirationNotInFuture(
  expiration: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!isValidDate(expiration)) return false
  return expiration.getTime() <= now.getTime()
}

// Registra o erro no campo "Prazo para expiração da oportunidade", comparando
// com o instante da validação (o formulário pode ficar aberto por muito tempo).
export function refineMEIOpportunityExpirationInFuture(
  dates: MEIOpportunityDeadlines,
  ctx: RefinementCtx
): void {
  if (!isExpirationNotInFuture(dates.opportunity_expiration_date)) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: EXPIRATION_NOT_IN_FUTURE_MESSAGE,
    path: ['opportunity_expiration_date'],
  })
}

// Registra o erro no campo "Data limite para execução do serviço".
export function refineMEIOpportunityDeadlines(
  dates: MEIOpportunityDeadlines,
  ctx: RefinementCtx
): void {
  if (!isExecutionDeadlineBeforeExpiration(dates)) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: EXECUTION_BEFORE_EXPIRATION_MESSAGE,
    path: ['service_execution_deadline'],
  })
}
