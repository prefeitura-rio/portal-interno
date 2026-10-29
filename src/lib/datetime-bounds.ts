// Limite exclusivo de data e hora do DateTimePicker: o valor escolhido precisa
// ser estritamente posterior a `after`. O seletor trabalha com precisão de
// segundos (o campo de hora tem `step="1"` e os milissegundos vão a zero).

const SECOND_MS = 1000

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function lastSecondOfDay(day: Date): Date {
  const last = new Date(day)
  last.setHours(23, 59, 59, 0)
  return last
}

// O dia fica desabilitado no calendário quando nenhum horário dele (até
// 23:59:59) é posterior ao limite.
export function isDayWithoutTimeAfter(day: Date, after?: Date | null): boolean {
  if (!isValidDate(after)) return false
  return lastSecondOfDay(day).getTime() <= after.getTime()
}

// Menor instante, em segundos inteiros, estritamente posterior ao limite.
export function firstSecondAfter(after: Date): Date {
  return new Date(
    Math.floor(after.getTime() / SECOND_MS) * SECOND_MS + SECOND_MS
  )
}

// Mantém o valor quando ele já é posterior ao limite; senão, devolve o primeiro
// segundo válido, para que o seletor nunca entregue data e hora iguais ou
// anteriores ao limite.
export function ensureAfter(value: Date, after?: Date | null): Date {
  if (!isValidDate(after)) return value
  if (value.getTime() > after.getTime()) return value
  return firstSecondAfter(after)
}
