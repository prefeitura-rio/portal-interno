import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-46: a lista de inscritos filtra por turma e por unidade. A API Go só
// filtra por status/busca, então o BFF busca todas as páginas e filtra.

const {
  CLASS_FILTER_MAX_IDS,
  appendClassFilterParams,
  buildScheduleLocationIndex,
  fetchAllEnrollmentPages,
  hasClassFilter,
  matchesClassFilter,
  paginateLocally,
  parseClassFilterParams,
  parseIdListParam,
  resolveEnrollmentUnitId,
} = await import('../enrollment-class-filters.ts')

const { getScheduleOptions, getUnitOptions } = await import(
  '../../app/(private)/(app)/gorio/components/add-participants/utils/schedule-helpers.ts'
)

const UNIT_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const UNIT_B = 'bbbbbbbb-0000-4000-8000-000000000002'
const TURMA_A1 = 'aaaaaaaa-1111-4000-8000-000000000011'
const TURMA_A2 = 'aaaaaaaa-1111-4000-8000-000000000012'
const TURMA_B1 = 'bbbbbbbb-1111-4000-8000-000000000021'

// Curso no formato da API Go (snake_case)
const apiCourse = {
  modalidade: 'PRESENCIAL',
  locations: [
    {
      id: UNIT_A,
      address: 'Rua Exemplo, 100',
      neighborhood: 'Centro',
      schedules: [
        { id: TURMA_A1, class_time: '08:00 - 10:00', class_days: 'Segunda' },
        { id: TURMA_A2, class_time: '14:00 - 16:00', class_days: 'Terça' },
      ],
    },
    {
      id: UNIT_B,
      address: 'Avenida Teste, 200',
      neighborhood: 'Tijuca',
      schedules: [
        { id: TURMA_B1, class_time: '19:00 - 21:00', class_days: 'Quarta' },
      ],
    },
  ],
}

// Mesmo curso no formato transformado do front (camelCase)
const frontCourse = {
  modalidade: 'PRESENCIAL',
  locations: apiCourse.locations.map(location => ({
    id: location.id,
    address: location.address,
    neighborhood: location.neighborhood,
    schedules: location.schedules.map(schedule => ({
      id: schedule.id,
      vacancies: 10,
      classTime: schedule.class_time,
      classDays: schedule.class_days,
    })),
  })),
}

const index = buildScheduleLocationIndex(apiCourse)

describe('parseIdListParam', () => {
  test('ausente = sem filtro', () => {
    assert.deepEqual(parseIdListParam(null), [])
  })

  test('separa por vírgula, ignora vazios e repetidos', () => {
    assert.deepEqual(parseIdListParam(` ${TURMA_A1},,${TURMA_A1},${UNIT_B} `), [
      TURMA_A1,
      UNIT_B,
    ])
  })

  test('recusa id com caracteres fora de [A-Za-z0-9-]', () => {
    assert.equal(parseIdListParam(`${TURMA_A1},x' OR 1=1`), null)
    assert.equal(parseIdListParam('../etc'), null)
    assert.equal(parseIdListParam('a'.repeat(65)), null)
  })

  test('recusa lista acima do teto', () => {
    const ids = Array.from(
      { length: CLASS_FILTER_MAX_IDS + 1 },
      (_, i) => `id-${i}`
    )
    assert.equal(parseIdListParam(ids.join(',')), null)
    assert.equal(
      parseIdListParam(ids.slice(0, CLASS_FILTER_MAX_IDS).join(','))?.length,
      CLASS_FILTER_MAX_IDS
    )
  })
})

describe('parseClassFilterParams', () => {
  test('lê scheduleIds e unitIds', () => {
    const result = parseClassFilterParams(
      new URLSearchParams({ scheduleIds: TURMA_A1, unitIds: UNIT_B })
    )
    assert.deepEqual(result, {
      ok: true,
      filter: { scheduleIds: [TURMA_A1], unitIds: [UNIT_B] },
    })
  })

  test('parâmetro inválido vira erro', () => {
    const bad = parseClassFilterParams(
      new URLSearchParams({ unitIds: '<script>' })
    )
    assert.equal(bad.ok, false)
  })
})

describe('appendClassFilterParams / hasClassFilter', () => {
  test('só acrescenta listas não vazias', () => {
    const params = new URLSearchParams({ page: '1' })
    appendClassFilterParams(params, { scheduleIds: [TURMA_A1, TURMA_B1] })
    assert.equal(params.get('scheduleIds'), `${TURMA_A1},${TURMA_B1}`)
    assert.equal(params.has('unitIds'), false)

    const empty = new URLSearchParams()
    appendClassFilterParams(empty, { scheduleIds: [], unitIds: [] })
    appendClassFilterParams(empty, undefined)
    assert.equal(empty.toString(), '')
  })

  test('hasClassFilter', () => {
    assert.equal(hasClassFilter({ scheduleIds: [], unitIds: [] }), false)
    assert.equal(hasClassFilter(undefined), false)
    assert.equal(hasClassFilter({ unitIds: [UNIT_A] }), true)
  })
})

describe('buildScheduleLocationIndex', () => {
  test('mapeia turma → unidade nos dois formatos de curso', () => {
    for (const course of [apiCourse, frontCourse]) {
      const built = buildScheduleLocationIndex(course)
      assert.equal(built.get(TURMA_A1), UNIT_A)
      assert.equal(built.get(TURMA_A2), UNIT_A)
      assert.equal(built.get(TURMA_B1), UNIT_B)
      assert.equal(built.size, 3)
    }
  })

  test('tolera curso sem locais ou com dados malformados', () => {
    assert.equal(buildScheduleLocationIndex(null).size, 0)
    assert.equal(buildScheduleLocationIndex({ locations: 'x' }).size, 0)
    assert.equal(
      buildScheduleLocationIndex({
        locations: [
          null,
          { id: '', schedules: [{ id: TURMA_A1 }] },
          { id: UNIT_A, schedules: [{}] },
        ],
      }).size,
      0
    )
  })
})

describe('matchesClassFilter', () => {
  const inA1 = { schedule_id: TURMA_A1 }
  const inA2 = { schedule_id: TURMA_A2 }
  const inB1 = { schedule_id: TURMA_B1 }
  const legacyInB = { schedule_id: null, enrolled_unit: { id: UNIT_B } }
  const noClass = {}
  const all = [inA1, inA2, inB1, legacyInB, noClass]

  const run = (scheduleIds: string[], unitIds: string[]) =>
    all.filter(e => matchesClassFilter(e, { scheduleIds, unitIds }, index))

  test('sem filtro aceita todas', () => {
    assert.deepEqual(run([], []), all)
  })

  test('por turma', () => {
    assert.deepEqual(run([TURMA_A2], []), [inA2])
    assert.deepEqual(run([TURMA_A1, TURMA_B1], []), [inA1, inB1])
  })

  test('por unidade: turmas do local e inscrição antiga pela enrolled_unit', () => {
    assert.deepEqual(run([], [UNIT_A]), [inA1, inA2])
    assert.deepEqual(run([], [UNIT_B]), [inB1, legacyInB])
  })

  test('turma e unidade combinadas (interseção)', () => {
    assert.deepEqual(run([TURMA_A1, TURMA_B1], [UNIT_A]), [inA1])
    assert.deepEqual(run([TURMA_A1], [UNIT_B]), [])
  })

  test('unidade da turma prevalece sobre enrolled_unit divergente', () => {
    const moved = { schedule_id: TURMA_A1, enrolled_unit: { id: UNIT_B } }
    assert.equal(resolveEnrollmentUnitId(moved, index), UNIT_A)
    assert.equal(
      matchesClassFilter(moved, { scheduleIds: [], unitIds: [UNIT_B] }, index),
      false
    )
  })
})

describe('fetchAllEnrollmentPages', () => {
  function fakeApi(total: number) {
    const calls: Array<[number, number]> = []
    const fetchPage = async (page: number, limit: number) => {
      calls.push([page, limit])
      const start = (page - 1) * limit
      const items = Array.from(
        { length: Math.max(0, Math.min(limit, total - start)) },
        (_, i) => start + i
      )
      return { items, total }
    }
    return { calls, fetchPage }
  }

  test('busca todas as páginas até o total', async () => {
    const api = fakeApi(25)
    const result = await fetchAllEnrollmentPages(api.fetchPage, 10, 5)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.items.length, 25)
    assert.deepEqual(api.calls, [
      [1, 10],
      [2, 10],
      [3, 10],
    ])
  })

  test('recusa curso acima do teto em vez de truncar', async () => {
    const api = fakeApi(51)
    const result = await fetchAllEnrollmentPages(api.fetchPage, 10, 5)
    assert.deepEqual(result, { ok: false, reason: 'too_many', total: 51 })
    assert.equal(api.calls.length, 1)
  })

  test('erro da API em qualquer página é repassado', async () => {
    let call = 0
    const result = await fetchAllEnrollmentPages(
      async () => {
        call += 1
        return call === 1 ? { items: [1], total: 3 } : { error: 503 }
      },
      1,
      5
    )
    assert.deepEqual(result, { ok: false, reason: 'upstream', status: 503 })
  })

  test('para se a API devolver página vazia antes do total', async () => {
    let call = 0
    const result = await fetchAllEnrollmentPages(
      async () => {
        call += 1
        return { items: call === 1 ? [1, 2] : [], total: 10 }
      },
      2,
      5
    )
    assert.equal(result.ok, true)
    assert.equal(call, 2)
  })
})

describe('paginateLocally', () => {
  const items = Array.from({ length: 23 }, (_, i) => i)

  test('fatia a página pedida', () => {
    const second = paginateLocally(items, 2, 10)
    assert.deepEqual(second.items, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
    assert.deepEqual(second.pagination, {
      page: 2,
      perPage: 10,
      total: 23,
      totalPages: 3,
    })
    assert.deepEqual(paginateLocally(items, 3, 10).items, [20, 21, 22])
  })

  test('valores inválidos caem no padrão', () => {
    const page = paginateLocally(items, Number.NaN, Number.NaN)
    assert.equal(page.pagination.page, 1)
    assert.equal(page.pagination.perPage, 10)
    assert.equal(paginateLocally(items, -3, 0).pagination.perPage, 1)
  })
})

describe('opções de unidade e turma do curso', () => {
  test('unidades = locais presenciais com id', () => {
    assert.deepEqual(getUnitOptions(frontCourse), [
      { id: UNIT_A, label: 'Rua Exemplo (Centro)' },
      { id: UNIT_B, label: 'Avenida Teste (Tijuca)' },
    ])
  })

  test('curso online não tem unidade', () => {
    assert.deepEqual(
      getUnitOptions({
        modalidade: 'ONLINE',
        remote_class: {
          id: 'remote-1',
          schedules: [{ id: 'turma-online-1', vacancies: 10 }],
        },
      }),
      []
    )
  })

  test('toda turma do filtro pertence a uma unidade do filtro', () => {
    const unitIds = new Set(getUnitOptions(frontCourse).map(u => u.id))
    const frontIndex = buildScheduleLocationIndex(frontCourse)
    const schedules = getScheduleOptions(frontCourse)
    assert.equal(schedules.length, 3)
    for (const schedule of schedules) {
      assert.equal(frontIndex.get(schedule.id), schedule.locationId)
      assert.ok(unitIds.has(schedule.locationId))
    }
  })
})
