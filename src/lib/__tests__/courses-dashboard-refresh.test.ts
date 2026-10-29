import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, mock, test } from 'node:test'

// DEV-106: o Dashboard de Capacitações (cards de pipeline e tabela por
// secretaria) se atualiza sozinho ao menos uma vez a cada 2 horas, sem
// recarregar a página nem clicar em "Atualizar".

const {
  COURSES_DASHBOARD_REFRESH_INTERVAL_MS,
  COURSES_DASHBOARD_REFRESH_QUERY_OPTIONS,
  startPeriodicRefresh,
} = await import('../courses-dashboard-refresh.ts')

const MINUTE_MS = 60 * 1000
const TWO_HOURS_MS = 2 * 60 * MINUTE_MS

describe('intervalo de revalidação do dashboard', () => {
  test('é positivo e de no máximo 2 horas', () => {
    assert.ok(Number.isFinite(COURSES_DASHBOARD_REFRESH_INTERVAL_MS))
    assert.ok(COURSES_DASHBOARD_REFRESH_INTERVAL_MS > 0)
    assert.ok(COURSES_DASHBOARD_REFRESH_INTERVAL_MS <= TWO_HOURS_MS)
  })

  test('a tabela por secretaria revalida no mesmo intervalo, também em segundo plano', () => {
    assert.deepEqual(COURSES_DASHBOARD_REFRESH_QUERY_OPTIONS, {
      refetchInterval: COURSES_DASHBOARD_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    })
  })
})

describe('startPeriodicRefresh', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setInterval'] })
  })

  afterEach(() => {
    mock.timers.reset()
  })

  test('não busca de novo antes do intervalo', () => {
    const refresh = mock.fn()
    const stop = startPeriodicRefresh(
      refresh,
      COURSES_DASHBOARD_REFRESH_INTERVAL_MS
    )

    mock.timers.tick(COURSES_DASHBOARD_REFRESH_INTERVAL_MS - 1)
    assert.equal(refresh.mock.callCount(), 0)
    stop()
  })

  test('busca de novo a cada intervalo enquanto a página está aberta', () => {
    const refresh = mock.fn()
    const stop = startPeriodicRefresh(
      refresh,
      COURSES_DASHBOARD_REFRESH_INTERVAL_MS
    )

    mock.timers.tick(COURSES_DASHBOARD_REFRESH_INTERVAL_MS)
    assert.equal(refresh.mock.callCount(), 1)

    // Página aberta por um dia inteiro: uma revalidação a cada 2 horas
    mock.timers.tick(COURSES_DASHBOARD_REFRESH_INTERVAL_MS * 11)
    assert.equal(refresh.mock.callCount(), 12)
    stop()
  })

  test('para de buscar depois do cleanup, e o cleanup repetido é inofensivo', () => {
    const refresh = mock.fn()
    const stop = startPeriodicRefresh(refresh, 30 * MINUTE_MS)

    mock.timers.tick(30 * MINUTE_MS)
    assert.equal(refresh.mock.callCount(), 1)

    stop()
    stop()
    mock.timers.tick(TWO_HOURS_MS * 3)
    assert.equal(refresh.mock.callCount(), 1)
  })

  test('intervalo ausente ou inválido não agenda nada', () => {
    const refresh = mock.fn()
    for (const interval of [
      undefined,
      0,
      -TWO_HOURS_MS,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const stop = startPeriodicRefresh(refresh, interval)
      mock.timers.tick(TWO_HOURS_MS * 2)
      stop()
    }
    assert.equal(refresh.mock.callCount(), 0)
  })
})
