import { type RefinementCtx, z } from 'zod'

export const ENROLLMENT_END_AFTER_CLASS_END_MESSAGE =
  'O fim das inscrições não pode ser posterior ao fim das aulas.'

export interface TurmaEnrollmentWindow {
  enrollmentEndDate?: Date | null
  classEndDate?: Date | null
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

// A turma não pode aceitar inscrições depois de as aulas terminarem: o cidadão
// se inscreveria numa turma já encerrada. Sem data final das aulas (turmas
// online podem não tê-la), não há o que comparar.
export function isEnrollmentEndAfterClassEnd(
  turma: TurmaEnrollmentWindow
): boolean {
  const { enrollmentEndDate, classEndDate } = turma
  if (!isValidDate(enrollmentEndDate) || !isValidDate(classEndDate))
    return false
  return enrollmentEndDate.getTime() > classEndDate.getTime()
}

// Registra o erro no campo "Fim das inscrições" da turma em `path`.
export function refineTurmaEnrollmentEnd(
  ctx: RefinementCtx,
  turma: TurmaEnrollmentWindow,
  path: (string | number)[]
): void {
  if (!isEnrollmentEndAfterClassEnd(turma)) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: ENROLLMENT_END_AFTER_CLASS_END_MESSAGE,
    path: [...path, 'enrollmentEndDate'],
  })
}
