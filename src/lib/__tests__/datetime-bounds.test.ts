import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  ensureAfter,
  firstSecondAfter,
  isDayWithoutTimeAfter,
} from '../datetime-bounds.ts'

// Datas no fuso local, como o calendário as entrega
const local = (
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0
) => new Date(2026, 0, day, hours, minutes, seconds, milliseconds)

describe('isDayWithoutTimeAfter (dias desabilitados no calendário)', () => {
  test('dias anteriores ao limite ficam desabilitados', () => {
    assert.equal(isDayWithoutTimeAfter(local(14), local(15, 18)), true)
  })

  test('o dia do limite fica habilitado quando ainda há horário depois dele', () => {
    assert.equal(isDayWithoutTimeAfter(local(15), local(15, 18)), false)
    assert.equal(isDayWithoutTimeAfter(local(16), local(15, 18)), false)
  })

  test('o dia do limite fica desabilitado quando o limite é o último segundo dele', () => {
    assert.equal(isDayWithoutTimeAfter(local(15), local(15, 23, 59, 59)), true)
    assert.equal(isDayWithoutTimeAfter(local(16), local(15, 23, 59, 59)), false)
  })

  test('sem limite (ou limite inválido), nada é desabilitado', () => {
    assert.equal(isDayWithoutTimeAfter(local(1), undefined), false)
    assert.equal(isDayWithoutTimeAfter(local(1), null), false)
    assert.equal(
      isDayWithoutTimeAfter(local(1), new Date('data inválida')),
      false
    )
  })
})

describe('ensureAfter (data e hora nunca iguais ou anteriores ao limite)', () => {
  test('valor posterior ao limite é mantido', () => {
    assert.deepEqual(ensureAfter(local(15, 19), local(15, 18)), local(15, 19))
  })

  test('valor igual ao limite vira o segundo seguinte', () => {
    assert.deepEqual(
      ensureAfter(local(15, 18), local(15, 18)),
      local(15, 18, 0, 1)
    )
  })

  test('horário anterior ao limite no mesmo dia vira o segundo seguinte ao limite', () => {
    assert.deepEqual(
      ensureAfter(local(15, 9), local(15, 18)),
      local(15, 18, 0, 1)
    )
  })

  test('limite com milissegundos arredonda para o segundo inteiro seguinte', () => {
    assert.deepEqual(
      firstSecondAfter(local(15, 18, 0, 0, 500)),
      local(15, 18, 0, 1)
    )
  })

  test('sem limite, o valor é mantido', () => {
    assert.deepEqual(ensureAfter(local(15, 9), undefined), local(15, 9))
  })
})
