import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { getScheduleVacancySummaries } from '../course-schedule-vacancies.ts'

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
