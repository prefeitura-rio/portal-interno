import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-100: o Dashboard de Capacitações soma, por secretaria, os cursos
// publicados e as inscrições de cada um. A API Go não tem consolidado: o BFF
// lê todas as páginas de cursos e conta as inscrições curso a curso.

const {
  DASHBOARD_ENROLLMENT_CONCURRENCY,
  DASHBOARD_PUBLISHED_STATUSES,
  aggregateBySecretaria,
  buildCoursesDashboard,
  countEnrollmentsByCourse,
  fetchAllPublishedCourses,
  parseCoursesPage,
  parseEnrollmentTotal,
} = await import('../courses-dashboard.ts')
// Status da aba "Cursos Criados" (/api/courses) que a tabela mostra com o
// selo "Publicado" ou com um status derivado de published
const PUBLISHED_STATUSES_OF_CREATED_TAB = [
  'opened',
  'published',
  'scheduled',
  'accepting_enrollments',
  'in_progress',
  'finished',
]

interface FakeCourse {
  id: unknown
  orgao_id?: unknown
}

/** Página da listagem de cursos no formato da API Go. */
function coursesPage(
  courses: FakeCourse[],
  total: number,
  totalPages: number
): { status: number; data: unknown } {
  return {
    status: 200,
    data: {
      success: true,
      data: {
        courses,
        pagination: { page: 1, limit: 1000, total, total_pages: totalPages },
      },
    },
  }
}

function enrollmentsPage(total: number): { status: number; data: unknown } {
  return {
    status: 200,
    data: {
      success: true,
      data: {
        enrollments: [],
        pagination: { page: 1, limit: 1, total, total_pages: total },
        summary: { total },
      },
    },
  }
}

describe('status de curso publicado', () => {
  test('são os da aba "Cursos Criados" com selo Publicado', () => {
    assert.deepEqual(
      [...DASHBOARD_PUBLISHED_STATUSES],
      PUBLISHED_STATUSES_OF_CREATED_TAB
    )
    for (const fora of [
      'draft',
      'in_review',
      'needs_changes',
      'approved',
      'canceled',
      'closed',
      'pending_deletion',
    ]) {
      assert.ok(
        !(DASHBOARD_PUBLISHED_STATUSES as readonly string[]).includes(fora),
        fora
      )
    }
  })
})

describe('parseCoursesPage', () => {
  test('lê id, secretaria e paginação da resposta da API Go', () => {
    const page = parseCoursesPage(
      coursesPage(
        [{ id: 10, orgao_id: ' SMTE ' }, { id: 11, orgao_id: '' }, { id: 12 }],
        3,
        1
      ).data
    )
    assert.deepEqual(page, {
      courses: [
        { id: 10, orgaoId: 'SMTE' },
        { id: 11, orgaoId: null },
        { id: 12, orgaoId: null },
      ],
      total: 3,
      totalPages: 1,
    })
  })

  test('descarta curso com id inválido e secretaria que não é texto', () => {
    const page = parseCoursesPage(
      coursesPage(
        [
          { id: '10' },
          { id: -1 },
          { id: 1.5 },
          { id: 0 },
          { id: 7, orgao_id: { $ne: null } },
          null as unknown as FakeCourse,
        ],
        6,
        1
      ).data
    )
    assert.deepEqual(page?.courses, [{ id: 7, orgaoId: null }])
  })

  test('resposta sem lista de cursos ou sem total é inválida', () => {
    assert.equal(parseCoursesPage(null), null)
    assert.equal(parseCoursesPage('erro'), null)
    assert.equal(parseCoursesPage({ data: { courses: 'x' } }), null)
    assert.equal(
      parseCoursesPage({ data: { courses: [], pagination: { total: -1 } } }),
      null
    )
    assert.equal(parseCoursesPage({ data: { courses: [] } }), null)
  })
})

describe('parseEnrollmentTotal', () => {
  test('usa pagination.total da listagem de inscrições', () => {
    assert.equal(parseEnrollmentTotal(enrollmentsPage(42).data), 42)
    assert.equal(parseEnrollmentTotal(enrollmentsPage(0).data), 0)
  })

  test('total ausente ou inválido vira null', () => {
    assert.equal(parseEnrollmentTotal(undefined), null)
    assert.equal(parseEnrollmentTotal({ data: {} }), null)
    assert.equal(
      parseEnrollmentTotal({ data: { pagination: { total: '3' } } }),
      null
    )
    assert.equal(
      parseEnrollmentTotal({ data: { pagination: { total: 2.5 } } }),
      null
    )
  })
})

describe('fetchAllPublishedCourses', () => {
  test('lê todas as páginas, com a maior página aceita pela API', async () => {
    const calls: Array<[number, number]> = []
    const result = await fetchAllPublishedCourses(async (page, limit) => {
      calls.push([page, limit])
      return page === 1
        ? coursesPage([{ id: 1 }, { id: 2 }], 3, 2)
        : coursesPage([{ id: 3 }], 3, 2)
    })
    assert.deepEqual(calls, [
      [1, 1000],
      [2, 1000],
    ])
    assert.deepEqual(result, {
      ok: true,
      courses: [
        { id: 1, orgaoId: null },
        { id: 2, orgaoId: null },
        { id: 3, orgaoId: null },
      ],
    })
  })

  test('curso repetido entre páginas conta uma vez só', async () => {
    const result = await fetchAllPublishedCourses(async page =>
      page === 1
        ? coursesPage([{ id: 1 }, { id: 2 }], 3, 2)
        : coursesPage([{ id: 2 }, { id: 3 }], 3, 2)
    )
    assert.ok(result.ok)
    assert.deepEqual(
      result.courses.map(course => course.id),
      [1, 2, 3]
    )
  })

  test('falha de uma página derruba o consolidado com o status dela', async () => {
    const result = await fetchAllPublishedCourses(async page =>
      page === 1
        ? coursesPage([{ id: 1 }], 2, 2)
        : { status: 503, data: 'indisponível' }
    )
    assert.deepEqual(result, { ok: false, status: 503 })
  })

  test('resposta inválida vira 502', async () => {
    const result = await fetchAllPublishedCourses(async () => ({
      status: 200,
      data: '<html>',
    }))
    assert.deepEqual(result, { ok: false, status: 502 })
  })

  test('não entra em laço quando a API anuncia páginas sem fim', async () => {
    let calls = 0
    const result = await fetchAllPublishedCourses(
      async page => {
        calls++
        return coursesPage([{ id: page }], 1_000_000, 1_000_000)
      },
      1000,
      5
    )
    assert.equal(calls, 5)
    assert.deepEqual(result, { ok: false, status: 502 })
  })

  test('página vazia encerra a leitura', async () => {
    let calls = 0
    const result = await fetchAllPublishedCourses(async () => {
      calls++
      return coursesPage([], 0, 0)
    })
    assert.equal(calls, 1)
    assert.deepEqual(result, { ok: true, courses: [] })
  })
})

describe('countEnrollmentsByCourse', () => {
  test('conta cada curso e isola a falha de um deles', async () => {
    const counts = await countEnrollmentsByCourse([1, 2, 3, 4], async id => {
      if (id === 2) return { status: 500, data: {} }
      if (id === 3) throw new Error('rede')
      return enrollmentsPage(id * 10)
    })
    assert.deepEqual(
      [...counts.entries()].sort(([a], [b]) => a - b),
      [
        [1, 10],
        [2, null],
        [3, null],
        [4, 40],
      ]
    )
  })

  test('respeita o limite de consultas simultâneas', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const ids = Array.from({ length: 30 }, (_, index) => index + 1)
    const counts = await countEnrollmentsByCourse(ids, async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 1))
      inFlight--
      return enrollmentsPage(1)
    })
    assert.equal(counts.size, 30)
    assert.equal(maxInFlight, DASHBOARD_ENROLLMENT_CONCURRENCY)
  })

  test('sem cursos, não consulta nada', async () => {
    const counts = await countEnrollmentsByCourse([], async () => {
      throw new Error('não devia consultar')
    })
    assert.equal(counts.size, 0)
  })
})

describe('aggregateBySecretaria', () => {
  test('soma cursos e inscritos por secretaria, sem secretaria por último', () => {
    const summary = aggregateBySecretaria(
      [
        { id: 1, orgaoId: 'SMTE' },
        { id: 2, orgaoId: 'SMTE' },
        { id: 3, orgaoId: 'SMAS' },
        { id: 4, orgaoId: null },
        { id: 5, orgaoId: null },
        { id: 6, orgaoId: null },
        { id: 7, orgaoId: 'SME' },
      ],
      new Map([
        [1, 5],
        [2, 7],
        [3, 100],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 3],
      ])
    )
    assert.deepEqual(summary.secretarias, [
      {
        orgaoId: 'SMTE',
        publishedCourses: 2,
        totalEnrollments: 12,
        coursesWithoutEnrollmentCount: 0,
      },
      {
        orgaoId: 'SMAS',
        publishedCourses: 1,
        totalEnrollments: 100,
        coursesWithoutEnrollmentCount: 0,
      },
      {
        orgaoId: 'SME',
        publishedCourses: 1,
        totalEnrollments: 3,
        coursesWithoutEnrollmentCount: 0,
      },
      {
        orgaoId: null,
        publishedCourses: 3,
        totalEnrollments: 3,
        coursesWithoutEnrollmentCount: 0,
      },
    ])
    assert.deepEqual(summary.totals, {
      publishedCourses: 7,
      totalEnrollments: 118,
      coursesWithoutEnrollmentCount: 0,
    })
  })

  test('curso sem contagem fica fora da soma e é sinalizado', () => {
    const summary = aggregateBySecretaria(
      [
        { id: 1, orgaoId: 'SMTE' },
        { id: 2, orgaoId: 'SMTE' },
        { id: 3, orgaoId: 'SMTE' },
      ],
      new Map([
        [1, 4],
        [2, null],
      ])
    )
    assert.deepEqual(summary.secretarias, [
      {
        orgaoId: 'SMTE',
        publishedCourses: 3,
        totalEnrollments: 4,
        coursesWithoutEnrollmentCount: 2,
      },
    ])
    assert.equal(summary.totals.coursesWithoutEnrollmentCount, 2)
  })

  test('sem cursos publicados, tabela vazia e totais zerados', () => {
    assert.deepEqual(aggregateBySecretaria([], new Map()), {
      secretarias: [],
      totals: {
        publishedCourses: 0,
        totalEnrollments: 0,
        coursesWithoutEnrollmentCount: 0,
      },
    })
  })
})

describe('buildCoursesDashboard', () => {
  test('consolida cursos de todas as páginas com as inscrições de cada um', async () => {
    const enrollmentCalls: number[] = []
    const result = await buildCoursesDashboard({
      listPublishedCoursesPage: async page =>
        page === 1
          ? coursesPage(
              [
                { id: 1, orgao_id: 'SMTE' },
                { id: 2, orgao_id: 'SMAS' },
              ],
              3,
              2
            )
          : coursesPage([{ id: 3, orgao_id: 'SMTE' }], 3, 2),
      fetchCourseEnrollments: async id => {
        enrollmentCalls.push(id)
        return enrollmentsPage(id)
      },
    })
    assert.deepEqual(
      enrollmentCalls.sort((a, b) => a - b),
      [1, 2, 3]
    )
    assert.ok(result.ok)
    assert.deepEqual(result.summary.totals, {
      publishedCourses: 3,
      totalEnrollments: 6,
      coursesWithoutEnrollmentCount: 0,
    })
    assert.deepEqual(
      result.summary.secretarias.map(row => [
        row.orgaoId,
        row.publishedCourses,
        row.totalEnrollments,
      ]),
      [
        ['SMTE', 2, 4],
        ['SMAS', 1, 2],
      ]
    )
  })

  test('sem permissão na API Go, devolve o status sem contar inscrições', async () => {
    const result = await buildCoursesDashboard({
      listPublishedCoursesPage: async () => ({ status: 403, data: {} }),
      fetchCourseEnrollments: async () => {
        throw new Error('não devia consultar')
      },
    })
    assert.deepEqual(result, { ok: false, status: 403 })
  })
})
