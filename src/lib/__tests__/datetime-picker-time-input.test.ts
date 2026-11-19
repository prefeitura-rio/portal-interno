import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { ensureAfter, withTime } from '../datetime-bounds.ts'

// DEV-679: com a data de hoje e `after` = agora, a hora digitada não pode ser
// trocada por "agora + 1s" a cada mudança do campo; o limite só vale ao
// confirmar o campo de hora.

const local = (day: number, hours = 0, minutes = 0, seconds = 0) =>
  new Date(2026, 0, day, hours, minutes, seconds, 0)

const pickerSource = readFileSync(
  new URL('../../components/ui/datetime-picker.tsx', import.meta.url),
  'utf8'
)

function handlerBody(name: string): string {
  const start = pickerSource.indexOf(`const ${name} =`)
  assert.ok(start >= 0, `${name} não encontrado no DateTimePicker`)
  const next = pickerSource.indexOf('\n  const ', start + 1)
  return pickerSource.slice(start, next === -1 ? undefined : next)
}

describe('withTime (hora digitada combinada ao dia, sem limite)', () => {
  test('aplica horas, minutos e segundos ao dia escolhido', () => {
    assert.deepEqual(withTime(local(15), '14:30:15'), local(15, 14, 30, 15))
  })

  test('aceita hora sem segundos', () => {
    assert.deepEqual(withTime(local(15), '14:30'), local(15, 14, 30, 0))
  })

  test('campo vazio vira meia-noite, sem quebrar', () => {
    assert.deepEqual(withTime(local(15, 9), ''), local(15))
  })

  test('zera os milissegundos e não altera o dia recebido', () => {
    const day = new Date(2026, 0, 15, 8, 0, 0, 500)
    assert.deepEqual(withTime(day, '10:00:00'), local(15, 10))
    assert.deepEqual(day, new Date(2026, 0, 15, 8, 0, 0, 500))
  })

  test('valores intermediários anteriores ao limite são mantidos enquanto se digita', () => {
    const agora = local(15, 10, 0, 0)
    // digitando 14:30:00 hora a hora: 01:30:00 e depois 14:30:00
    const intermediario = withTime(local(15), '01:30:00')
    assert.deepEqual(intermediario, local(15, 1, 30))
    assert.ok(intermediario.getTime() < agora.getTime())
    const final = withTime(intermediario, '14:30:00')
    assert.deepEqual(final, local(15, 14, 30))
    // ao confirmar, o horário futuro digitado fica como está
    assert.deepEqual(ensureAfter(final, agora), local(15, 14, 30))
  })

  test('ao confirmar um horário já passado, vale o primeiro segundo depois do limite', () => {
    const agora = local(15, 10, 0, 0)
    assert.deepEqual(
      ensureAfter(withTime(local(15), '09:00:00'), agora),
      local(15, 10, 0, 1)
    )
  })
})

describe('DateTimePicker: limite só ao confirmar a hora (DEV-679)', () => {
  test('a mudança do campo de hora não aplica o limite', () => {
    const body = handlerBody('handleTimeChange')
    assert.doesNotMatch(body, /ensureAfter\(/)
    assert.match(body, /withTime\(/)
  })

  test('o blur do campo de hora aplica o limite', () => {
    const body = handlerBody('handleTimeBlur')
    assert.match(body, /ensureAfter\(/)
    assert.match(pickerSource, /onBlur=\{handleTimeBlur\}/)
  })

  test('a escolha do dia no calendário continua aplicando o limite', () => {
    assert.match(handlerBody('handleDateSelect'), /ensureAfter\(/)
  })
})
