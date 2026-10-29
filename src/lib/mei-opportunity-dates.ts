import { type RefinementCtx, z } from 'zod'

export const EXECUTION_BEFORE_EXPIRATION_MESSAGE =
  'A data limite para execução não pode ser anterior ao prazo de expiração da oportunidade.'

export const SERVICE_EXECUTION_DEADLINE_REQUIRED_MESSAGE =
  'Data limite para execução do serviço é obrigatória.'

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
