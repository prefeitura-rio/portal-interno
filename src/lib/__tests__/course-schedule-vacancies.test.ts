import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  countScheduleOutcomes,
  formatScheduleOccupancyPercent,
  getScheduleOccupancyPercent,
  getScheduleOutcomeCounts,
  getScheduleVacancyStatus,
  getScheduleVacancySummaries,
} from '../course-schedule-vacancies.ts'

describe('getScheduleVacancySummaries', () => {
  test('presencial: uma linha por turma com vagas, ocupadas e disponíveis', () => {
    const course = {
      modalidade: 'PRESENCIAL',
      locations: [
        {
          id: 'loc-1',
          address: 'Rua Exemplo, 100',
          neighborhood: 'Centro',
          schedules: [
            {
              id: 'sch-1',
              vacancies: 30,
              remaining_vacancies: 12,
              class_days: 'Segunda e Quarta',
              class_time: '19:00 - 21:00',
            },
            {
              id: 'sch-2',
              vacancies: 20,
              remaining_vacancies: 20,
              class_days: 'Sábado',
              class_time: '09:00 - 12:00',
            },
          ],
        },
        {
          id: 'loc-2',
          address: 'Av. Teste, 2',
          neighborhood: 'Tijuca',
          schedules: [
            {
              id: 'sch-3',
              vacancies: 10,
              remaining_vacancies: 0,
              class_days: 'Terça',
              class_time: '14:00 - 16:00',
            },
          ],
        },
      ],
    }

    assert.deepEqual(getScheduleVacancySummaries(course), [
      {
        id: 'sch-1',
        turma: 'Turma 1',
        local: 'Rua Exemplo, 100 - Centro',
        dias: 'Segunda e Quarta',
        horario: '19:00 - 21:00',
        vagas: 30,
        ocupadas: 18,
        disponiveis: 12,
      },
      {
        id: 'sch-2',
        turma: 'Turma 2',
        local: 'Rua Exemplo, 100 - Centro',
        dias: 'Sábado',
        horario: '09:00 - 12:00',
        vagas: 20,
        ocupadas: 0,
        disponiveis: 20,
      },
      {
        id: 'sch-3',
        turma: 'Turma 1',
        local: 'Av. Teste, 2 - Tijuca',
        dias: 'Terça',
        horario: '14:00 - 16:00',
        vagas: 10,
        ocupadas: 10,
        disponiveis: 0,
      },
    ])
  })

  test('online: usa as turmas de remote_class', () => {
    const course = {
      modalidade: 'ONLINE',
      locations: [],
      remote_class: {
        id: 'remote-1',
        schedules: [
          {
            id: 'rs-1',
            vacancies: 50,
            remaining_vacancies: 45,
            class_days: 'Quinta',
            class_time: '18:00 - 20:00',
          },
        ],
      },
    }

    assert.deepEqual(getScheduleVacancySummaries(course), [
      {
        id: 'rs-1',
        turma: 'Turma 1',
        local: 'Online',
        dias: 'Quinta',
        horario: '18:00 - 20:00',
        vagas: 50,
        ocupadas: 5,
        disponiveis: 45,
      },
    ])
  })

  test('aceita a resposta da API ainda embrulhada em { data }', () => {
    const summaries = getScheduleVacancySummaries({
      success: true,
      data: {
        locations: [
          {
            address: 'Rua A',
            schedules: [{ id: 's', vacancies: 5, remaining_vacancies: 2 }],
          },
        ],
      },
    })

    assert.equal(summaries.length, 1)
    assert.equal(summaries[0].local, 'Rua A')
    assert.equal(summaries[0].ocupadas, 3)
    assert.equal(summaries[0].disponiveis, 2)
  })

  test('sem remaining_vacancies não inventa ocupação', () => {
    const [summary] = getScheduleVacancySummaries({
      locations: [{ address: 'Rua B', schedules: [{ id: 'x', vacancies: 8 }] }],
    })

    assert.equal(summary.vagas, 8)
    assert.equal(summary.ocupadas, null)
    assert.equal(summary.disponiveis, null)
  })

  test('limita disponíveis ao intervalo [0, vagas]', () => {
    const summaries = getScheduleVacancySummaries({
      locations: [
        {
          address: 'Rua C',
          schedules: [
            { id: 'neg', vacancies: 10, remaining_vacancies: -3 },
            { id: 'over', vacancies: 10, remaining_vacancies: 15 },
          ],
        },
      ],
    })

    assert.deepEqual(
      summaries.map(s => [s.id, s.ocupadas, s.disponiveis]),
      [
        ['neg', 10, 0],
        ['over', 0, 10],
      ]
    )
  })

  test('entrada inválida ou sem turmas devolve lista vazia', () => {
    assert.deepEqual(getScheduleVacancySummaries(null), [])
    assert.deepEqual(getScheduleVacancySummaries(undefined), [])
    assert.deepEqual(getScheduleVacancySummaries('curso'), [])
    assert.deepEqual(
      getScheduleVacancySummaries({ modalidade: 'LIVRE_FORMACAO_ONLINE' }),
      []
    )
    assert.deepEqual(
      getScheduleVacancySummaries({ locations: 'x', remote_class: 1 }),
      []
    )
  })

  test('ignora turma com vagas inválidas', () => {
    const summaries = getScheduleVacancySummaries({
      locations: [
        {
          address: 'Rua D',
          schedules: [
            { id: 'ok', vacancies: 4, remaining_vacancies: 1 },
            { id: 'bad', vacancies: 'muitas', remaining_vacancies: 1 },
            null,
          ],
        },
      ],
    })

    assert.deepEqual(
      summaries.map(s => s.id),
      ['ok']
    )
  })
})

describe('getScheduleOccupancyPercent / formatScheduleOccupancyPercent', () => {
  test('% Inscritos = Inscritos ÷ Vagas × 100, com 1 casa decimal', () => {
    const cases: Array<[number, number, string]> = [
      [20, 16, '80.0%'],
      [20, 17, '85.0%'],
      [10, 10, '100.0%'],
      [5, 0, '0.0%'],
      [3, 1, '33.3%'],
      [3, 2, '66.7%'],
    ]
    for (const [vagas, ocupadas, esperado] of cases) {
      assert.equal(
        formatScheduleOccupancyPercent(
          getScheduleOccupancyPercent({ vagas, ocupadas })
        ),
        esperado,
        `${ocupadas}/${vagas}`
      )
    }
  })

  test('sem ocupação conhecida ou sem vagas não inventa percentual', () => {
    assert.equal(
      getScheduleOccupancyPercent({ vagas: 8, ocupadas: null }),
      null
    )
    assert.equal(getScheduleOccupancyPercent({ vagas: 0, ocupadas: 0 }), null)
    assert.equal(formatScheduleOccupancyPercent(null), '—')
  })
})

describe('getScheduleVacancyStatus', () => {
  test('esgotado com 0 vagas livres', () => {
    assert.equal(
      getScheduleVacancyStatus({ vagas: 10, disponiveis: 0 }),
      'esgotado'
    )
    assert.equal(
      getScheduleVacancyStatus({ vagas: 0, disponiveis: 0 }),
      'esgotado'
    )
  })

  test('disponível com mais de 20% das vagas livres', () => {
    assert.equal(
      getScheduleVacancyStatus({ vagas: 5, disponiveis: 5 }),
      'disponivel'
    )
    assert.equal(
      getScheduleVacancyStatus({ vagas: 1, disponiveis: 1 }),
      'disponivel'
    )
    assert.equal(
      getScheduleVacancyStatus({ vagas: 20, disponiveis: 5 }),
      'disponivel'
    )
  })

  test('quase lotado com vaga livre, mas no máximo 20% do total', () => {
    assert.equal(
      getScheduleVacancyStatus({ vagas: 20, disponiveis: 4 }),
      'quase-lotado'
    )
    assert.equal(
      getScheduleVacancyStatus({ vagas: 20, disponiveis: 3 }),
      'quase-lotado'
    )
    assert.equal(
      getScheduleVacancyStatus({ vagas: 10, disponiveis: 1 }),
      'quase-lotado'
    )
  })

  test('sem vagas restantes informadas não há status', () => {
    assert.equal(
      getScheduleVacancyStatus({ vagas: 8, disponiveis: null }),
      null
    )
  })
})

describe('countScheduleOutcomes', () => {
  test('conta recusados e concluídos separados por turma', () => {
    const counts = countScheduleOutcomes([
      { id: 'e1', schedule_id: 'sch-1', status: 'rejected' },
      { id: 'e2', schedule_id: 'sch-1', status: 'rejected' },
      { id: 'e3', schedule_id: 'sch-1', status: 'concluded' },
      { id: 'e4', schedule_id: 'sch-2', status: 'concluded' },
      { id: 'e5', schedule_id: 'sch-2', status: 'concluded' },
    ])
    assert.deepEqual(getScheduleOutcomeCounts(counts, 'sch-1'), {
      recusados: 2,
      concluidos: 1,
    })
    assert.deepEqual(getScheduleOutcomeCounts(counts, 'sch-2'), {
      recusados: 0,
      concluidos: 2,
    })
  })

  test('outros status não entram nas colunas', () => {
    const counts = countScheduleOutcomes([
      { id: 'e1', schedule_id: 'sch-1', status: 'pending' },
      { id: 'e2', schedule_id: 'sch-1', status: 'approved' },
      { id: 'e3', schedule_id: 'sch-1', status: 'cancelled' },
      { id: 'e4', schedule_id: 'sch-1', status: 'rejected' },
    ])
    assert.deepEqual(getScheduleOutcomeCounts(counts, 'sch-1'), {
      recusados: 1,
      concluidos: 0,
    })
  })

  test('turma sem inscrição recusada nem concluída tem zeros', () => {
    const counts = countScheduleOutcomes([
      { id: 'e1', schedule_id: 'sch-1', status: 'rejected' },
    ])
    assert.deepEqual(getScheduleOutcomeCounts(counts, 'sch-9'), {
      recusados: 0,
      concluidos: 0,
    })
  })

  test('inscrição sem turma ou malformada é ignorada', () => {
    const counts = countScheduleOutcomes([
      { id: 'e1', status: 'rejected' },
      { id: 'e2', schedule_id: '', status: 'concluded' },
      { id: 'e3', schedule_id: null, status: 'rejected' },
      { id: 'e4', schedule_id: 42, status: 'rejected' },
      null,
      'texto',
      ['sch-1'],
    ])
    assert.equal(counts.size, 0)
  })

  test('a mesma inscrição repetida entre páginas conta uma vez', () => {
    const counts = countScheduleOutcomes([
      { id: 'e1', schedule_id: 'sch-1', status: 'rejected' },
      { id: 'e1', schedule_id: 'sch-1', status: 'rejected' },
      { id: 'e2', schedule_id: 'sch-1', status: 'concluded' },
    ])
    assert.deepEqual(getScheduleOutcomeCounts(counts, 'sch-1'), {
      recusados: 1,
      concluidos: 1,
    })
  })

  test('lista vazia não tem turma', () => {
    assert.equal(countScheduleOutcomes([]).size, 0)
  })
})
