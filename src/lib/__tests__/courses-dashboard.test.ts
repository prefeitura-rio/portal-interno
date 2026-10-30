import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-100: o Dashboard de Capacitações soma, por secretaria, os cursos
// publicados e as inscrições de cada um. A API Go não tem consolidado: o BFF
// lê todas as páginas de cursos e conta as inscrições curso a curso.

const {
  DASHBOARD_ENROLLMENT_CONCURRENCY,
  DASHBOARD_PUBLISHED_STATUSES,
  ENROLLMENT_COUNT_FRESH_TTL_MS,
  ENROLLMENT_COUNT_STALE_TTL_MS,
  EnrollmentCountCache,
  aggregateBySecretaria,
  attachSecretariaNames,
  buildCoursesDashboard,
  countEnrollmentsByCourse,
  DASHBOARD_COURSES_BASE_DELAY_MS,
  DASHBOARD_COURSES_MAX_ATTEMPTS,
  DASHBOARD_COURSES_MAX_DELAY_MS,
  fetchAllPublishedCourses,
  parseCoursesPage,
  parseEnrollmentTotal,
} = await import('../courses-dashboard.ts')
const { DepartmentNameCache, resolveDepartmentNames } = await import(
  '../department-names.ts'
)
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

/** Opções da listagem de cursos por teste: sem esperas reais. */
function listOptions(
  overrides: { slept?: number[]; deadlineMs?: number } = {}
) {
  return {
    deadlineMs: overrides.deadlineMs,
    sleep: async (ms: number) => {
      overrides.slept?.push(ms)
    },
  }
}

/** Opções de contagem isoladas por teste: cache novo e sem esperas reais. */
function countOptions(
  overrides: {
    cache?: InstanceType<typeof EnrollmentCountCache>
    now?: () => number
    sleep?: (ms: number) => Promise<void>
    deadlineMs?: number
    requestTimeoutMs?: number
    concurrency?: number
  } = {}
) {
  return {
    cache: overrides.cache ?? new EnrollmentCountCache(overrides.now),
    sleep: overrides.sleep ?? (async () => {}),
    ...overrides,
  }
}

function status(code: number, headers?: Record<string, string>) {
  return { status: code, data: {}, headers: new Headers(headers) }
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

  test('falha persistente de uma página derruba o consolidado com o status dela', async () => {
    const result = await fetchAllPublishedCourses(
      async page =>
        page === 1
          ? coursesPage([{ id: 1 }], 2, 2)
          : { status: 503, data: 'indisponível' },
      1000,
      50,
      listOptions()
    )
    assert.deepEqual(result, {
      ok: false,
      status: 503,
      reason: '503',
      page: 2,
      attempts: DASHBOARD_COURSES_MAX_ATTEMPTS,
    })
  })

  test('resposta inválida persistente vira 502', async () => {
    const result = await fetchAllPublishedCourses(
      async () => ({ status: 200, data: '<html>' }),
      1000,
      50,
      listOptions()
    )
    assert.deepEqual(result, {
      ok: false,
      status: 502,
      reason: 'invalid',
      page: 1,
      attempts: DASHBOARD_COURSES_MAX_ATTEMPTS,
    })
  })

  // DEV-115: uma rajada de cargas do dashboard esbarrava no limite de taxa
  // na listagem de cursos e derrubava o consolidado inteiro
  test('429, 5xx, erro de rede e resposta inválida tentam de novo e a página é lida', async () => {
    for (const failure of [
      async () => ({ status: 429, data: {} }),
      async () => ({ status: 502, data: 'bad gateway' }),
      async () => {
        throw new TypeError('fetch failed')
      },
      async () => ({ status: 200, data: '<html>' }),
    ]) {
      const calls: number[] = []
      const slept: number[] = []
      let page2Attempts = 0
      const result = await fetchAllPublishedCourses(
        async page => {
          calls.push(page)
          if (page === 1) return coursesPage([{ id: 1 }], 2, 2)
          page2Attempts++
          return page2Attempts === 1
            ? failure()
            : coursesPage([{ id: 2 }], 2, 2)
        },
        1000,
        50,
        listOptions({ slept })
      )
      assert.deepEqual(result, {
        ok: true,
        courses: [
          { id: 1, orgaoId: null },
          { id: 2, orgaoId: null },
        ],
      })
      assert.deepEqual(calls, [1, 2, 2])
      assert.deepEqual(slept, [DASHBOARD_COURSES_BASE_DELAY_MS])
    }
  })

  test('recuo exponencial entre as tentativas e respeito ao Retry-After', async () => {
    const slept: number[] = []
    let attempts = 0
    const result = await fetchAllPublishedCourses(
      async () => {
        attempts++
        return { status: 503, data: {} }
      },
      1000,
      50,
      listOptions({ slept })
    )
    assert.equal(result.ok, false)
    assert.equal(attempts, DASHBOARD_COURSES_MAX_ATTEMPTS)
    assert.deepEqual(slept, [
      DASHBOARD_COURSES_BASE_DELAY_MS,
      DASHBOARD_COURSES_BASE_DELAY_MS * 2,
    ])

    const sleptRetryAfter: number[] = []
    let calls = 0
    const retried = await fetchAllPublishedCourses(
      async () => {
        calls++
        return calls === 1
          ? {
              status: 429,
              data: {},
              headers: new Headers({ 'Retry-After': '2' }),
            }
          : calls === 2
            ? {
                status: 429,
                data: {},
                headers: new Headers({ 'Retry-After': '120' }),
              }
            : coursesPage([{ id: 7 }], 1, 1)
      },
      1000,
      50,
      listOptions({ slept: sleptRetryAfter, deadlineMs: 60_000 })
    )
    assert.ok(retried.ok)
    // Retry-After longo é limitado à maior espera
    assert.deepEqual(sleptRetryAfter, [2000, DASHBOARD_COURSES_MAX_DELAY_MS])
  })

  test('401, 403 e 4xx que não é limite de taxa não tentam de novo', async () => {
    for (const status of [401, 403, 400, 404]) {
      let calls = 0
      const slept: number[] = []
      const result = await fetchAllPublishedCourses(
        async () => {
          calls++
          return { status, data: {} }
        },
        1000,
        50,
        listOptions({ slept })
      )
      assert.deepEqual(result, {
        ok: false,
        status,
        reason: String(status),
        page: 1,
        attempts: 1,
      })
      assert.equal(calls, 1)
      assert.deepEqual(slept, [])
    }
  })

  test('erro de rede persistente vira 502 com o motivo', async () => {
    const result = await fetchAllPublishedCourses(
      async () => {
        throw new TypeError('fetch failed')
      },
      1000,
      50,
      listOptions()
    )
    assert.deepEqual(result, {
      ok: false,
      status: 502,
      reason: 'network',
      page: 1,
      attempts: DASHBOARD_COURSES_MAX_ATTEMPTS,
    })
  })

  test('não espera além do prazo: nova tentativa que passaria dele não é feita', async () => {
    const clock = { now: 0 }
    const slept: number[] = []
    let calls = 0
    const result = await fetchAllPublishedCourses(
      async () => {
        calls++
        return {
          status: 429,
          data: {},
          headers: new Headers({ 'Retry-After': '4' }),
        }
      },
      1000,
      50,
      {
        maxAttempts: 5,
        deadlineMs: 6_000,
        now: () => clock.now,
        sleep: async ms => {
          slept.push(ms)
          clock.now += ms
        },
      }
    )
    assert.deepEqual(slept, [4000])
    assert.equal(calls, 2)
    assert.deepEqual(result, {
      ok: false,
      status: 429,
      reason: '429',
      page: 1,
      attempts: 2,
    })
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
    assert.deepEqual(result, {
      ok: false,
      status: 502,
      reason: 'too_many_pages',
      page: 5,
      attempts: 1,
    })
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
    const { counts, stats } = await countEnrollmentsByCourse(
      [1, 2, 3, 4],
      async id => {
        if (id === 2) return status(500)
        if (id === 3) throw new Error('rede')
        return enrollmentsPage(id * 10)
      },
      countOptions()
    )
    assert.deepEqual(
      [...counts.entries()].sort(([a], [b]) => a - b),
      [
        [1, 10],
        [2, null],
        [3, null],
        [4, 40],
      ]
    )
    assert.deepEqual(stats, {
      fetched: 2,
      fromCache: 0,
      fromStale: 0,
      failed: 2,
      failures: { '500': 1, network: 1 },
    })
  })

  test('respeita o limite de consultas simultâneas', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const ids = Array.from({ length: 30 }, (_, index) => index + 1)
    const { counts } = await countEnrollmentsByCourse(
      ids,
      async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise(resolve => setTimeout(resolve, 1))
        inFlight--
        return enrollmentsPage(1)
      },
      countOptions()
    )
    assert.equal(counts.size, 30)
    assert.equal(maxInFlight, DASHBOARD_ENROLLMENT_CONCURRENCY)
    // DEV-112: com 8 simultâneas a rajada esbarrava no limite da API Go
    assert.ok(DASHBOARD_ENROLLMENT_CONCURRENCY <= 4)
  })

  test('sem cursos, não consulta nada', async () => {
    const { counts } = await countEnrollmentsByCourse(
      [],
      async () => {
        throw new Error('não devia consultar')
      },
      countOptions()
    )
    assert.equal(counts.size, 0)
  })

  test('429, 5xx e erro de rede tentam de novo e o curso é contado', async () => {
    const attempts = new Map<number, number>()
    const { counts, stats } = await countEnrollmentsByCourse(
      [1, 2, 3],
      async id => {
        const attempt = (attempts.get(id) ?? 0) + 1
        attempts.set(id, attempt)
        if (attempt === 1) {
          if (id === 1) return status(429)
          if (id === 2) return status(503)
          throw new Error('rede')
        }
        return enrollmentsPage(id)
      },
      countOptions()
    )
    assert.deepEqual(
      [...counts.entries()].sort(([a], [b]) => a - b),
      [
        [1, 1],
        [2, 2],
        [3, 3],
      ]
    )
    assert.equal(stats.failed, 0)
    assert.deepEqual(Object.fromEntries(attempts), { 1: 2, 2: 2, 3: 2 })
  })

  test('4xx que não é limite de taxa não tenta de novo', async () => {
    let calls = 0
    const { counts } = await countEnrollmentsByCourse(
      [1],
      async () => {
        calls++
        return status(404)
      },
      countOptions()
    )
    assert.equal(calls, 1)
    assert.equal(counts.get(1), null)
  })

  test('respeita Retry-After e pausa todos os workers depois de um 429', async () => {
    let clock = 0
    const waits: number[] = []
    const sentAt: number[] = []
    let limited = false
    const { counts } = await countEnrollmentsByCourse(
      [1, 2, 3, 4],
      async id => {
        sentAt.push(clock)
        if (id === 1 && !limited) {
          limited = true
          return status(429, { 'Retry-After': '2' })
        }
        return enrollmentsPage(id)
      },
      countOptions({
        now: () => clock,
        concurrency: 1,
        sleep: async ms => {
          waits.push(ms)
          clock += ms
        },
      })
    )
    assert.deepEqual(waits, [2000])
    // Nenhuma consulta depois do 429 sai antes do fim da pausa
    assert.deepEqual(sentAt, [0, 2000, 2000, 2000, 2000])
    assert.equal(counts.get(1), 1)
  })

  test('pausa de um 429 vale também para os outros workers', async () => {
    let clock = 0
    const sentAt = new Map<number, number[]>()
    let limited = false
    await countEnrollmentsByCourse(
      [1, 2, 3, 4],
      async id => {
        sentAt.set(id, [...(sentAt.get(id) ?? []), clock])
        if (id === 1 && !limited) {
          limited = true
          return status(429, { 'Retry-After': '3' })
        }
        // Os outros só respondem depois que o worker do curso 1 recebeu o 429
        await new Promise(resolve => setTimeout(resolve, 5))
        return enrollmentsPage(id)
      },
      countOptions({
        now: () => clock,
        concurrency: 2,
        // A espera leva um tempo real: o outro worker pede o próximo curso
        // enquanto o relógio ainda está no instante do 429
        sleep: async ms => {
          await new Promise(resolve => setTimeout(resolve, 20))
          clock += ms
        },
      })
    )
    // O curso 2 saiu junto com o 1; os seguintes, só depois da pausa
    assert.deepEqual(sentAt.get(2), [0])
    for (const id of [3, 4]) {
      assert.ok((sentAt.get(id)?.[0] ?? 0) >= 3000, `curso ${id}`)
    }
  })

  test('contagem fresca no cache não é consultada de novo', async () => {
    let clock = 0
    const cache = new EnrollmentCountCache(() => clock)
    const asked: number[] = []
    const fetch = async (id: number) => {
      asked.push(id)
      return enrollmentsPage(id * 2)
    }
    await countEnrollmentsByCourse([1, 2], fetch, countOptions({ cache }))
    clock += ENROLLMENT_COUNT_FRESH_TTL_MS - 1
    const second = await countEnrollmentsByCourse(
      [1, 2, 3],
      fetch,
      countOptions({ cache })
    )
    assert.deepEqual(asked, [1, 2, 3])
    assert.deepEqual(
      [...second.counts.entries()].sort(([a], [b]) => a - b),
      [
        [1, 2],
        [2, 4],
        [3, 6],
      ]
    )
    assert.equal(second.stats.fromCache, 2)
    assert.equal(second.stats.fetched, 1)

    // Vencida a validade, consulta de novo
    clock += 1
    await countEnrollmentsByCourse([1], fetch, countOptions({ cache }))
    assert.deepEqual(asked, [1, 2, 3, 1])
  })

  test('falha passageira usa a última contagem boa; acesso negado não', async () => {
    let clock = 0
    const cache = new EnrollmentCountCache(() => clock)
    await countEnrollmentsByCourse(
      [1, 2, 3],
      async id => enrollmentsPage(id * 10),
      countOptions({ cache })
    )
    clock += ENROLLMENT_COUNT_FRESH_TTL_MS
    const { counts, stats } = await countEnrollmentsByCourse(
      [1, 2, 3, 4],
      async id => {
        if (id === 1) return status(429)
        if (id === 2) return status(403)
        if (id === 3) throw new Error('rede')
        return status(500)
      },
      countOptions({ cache })
    )
    assert.deepEqual(
      [...counts.entries()].sort(([a], [b]) => a - b),
      [
        [1, 10],
        [2, null],
        [3, 30],
        [4, null],
      ]
    )
    assert.equal(stats.fromStale, 2)
    assert.equal(stats.failed, 2)
    assert.deepEqual(stats.failures, {
      '429': 1,
      '403': 1,
      network: 1,
      '500': 1,
    })
  })

  test('reserva vencida não é usada', async () => {
    let clock = 0
    const cache = new EnrollmentCountCache(() => clock)
    await countEnrollmentsByCourse(
      [1],
      async () => enrollmentsPage(5),
      countOptions({ cache })
    )
    clock += ENROLLMENT_COUNT_STALE_TTL_MS
    const { counts } = await countEnrollmentsByCourse(
      [1],
      async () => status(500),
      countOptions({ cache })
    )
    assert.equal(counts.get(1), null)
    assert.equal(cache.size, 0)
  })

  test('API travada não segura a carga: consulta lenta estoura e cai no prazo', async () => {
    const started = Date.now()
    const { counts, stats } = await countEnrollmentsByCourse(
      [1, 2, 3, 4, 5, 6],
      () => new Promise(() => {}),
      {
        cache: new EnrollmentCountCache(),
        deadlineMs: 300,
        requestTimeoutMs: 100,
        concurrency: 2,
      }
    )
    const elapsed = Date.now() - started
    assert.ok(elapsed < 1500, `levou ${elapsed} ms`)
    assert.equal(counts.size, 6)
    assert.ok([...counts.values()].every(count => count === null))
    assert.equal(stats.failed, 6)
    assert.ok((stats.failures.timeout ?? 0) >= 1)
  })

  test('cursos sem reserva no cache são consultados primeiro', async () => {
    let clock = 0
    const cache = new EnrollmentCountCache(() => clock)
    await countEnrollmentsByCourse(
      [1, 2],
      async id => enrollmentsPage(id),
      countOptions({ cache })
    )
    clock += ENROLLMENT_COUNT_FRESH_TTL_MS
    const asked: number[] = []
    await countEnrollmentsByCourse(
      [1, 2, 3, 4],
      async id => {
        asked.push(id)
        return enrollmentsPage(id)
      },
      countOptions({ cache, concurrency: 1 })
    )
    assert.deepEqual(asked, [3, 4, 1, 2])
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
      enrollmentCountOptions: countOptions(),
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
      resolveSecretarias: async ids =>
        new Map(
          ids.map(id => [
            id,
            { status: 'found' as const, nome: `Secretaria ${id}`, sigla: id },
          ])
        ),
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
    assert.deepEqual(result.enrollmentStats, {
      fetched: 3,
      fromCache: 0,
      fromStale: 0,
      failed: 0,
      failures: {},
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
      enrollmentCountOptions: countOptions(),
      listPublishedCoursesPage: async () => ({ status: 403, data: {} }),
      fetchCourseEnrollments: async () => {
        throw new Error('não devia consultar')
      },
      resolveSecretarias: async () => {
        throw new Error('não devia consultar')
      },
    })
    assert.deepEqual(result, {
      ok: false,
      status: 403,
      reason: '403',
      page: 1,
      attempts: 1,
    })
  })

  test('devolve o nome de cada secretaria, consultando cada código uma vez', async () => {
    const asked: string[][] = []
    const result = await buildCoursesDashboard({
      enrollmentCountOptions: countOptions(),
      listPublishedCoursesPage: async () =>
        coursesPage(
          [
            { id: 1, orgao_id: '1000' },
            { id: 2, orgao_id: '1000' },
            { id: 3, orgao_id: '2000' },
            { id: 4 },
          ],
          4,
          1
        ),
      fetchCourseEnrollments: async () => enrollmentsPage(1),
      resolveSecretarias: async ids => {
        asked.push([...ids])
        return new Map([
          [
            '1000',
            {
              status: 'found' as const,
              nome: 'Secretaria Municipal de Trabalho',
              sigla: 'SMTE',
            },
          ],
          ['2000', { status: 'unavailable' as const }],
        ])
      },
    })
    assert.deepEqual(asked, [['1000', '2000']])
    assert.ok(result.ok)
    assert.deepEqual(
      result.summary.secretarias.map(row => [row.orgaoId, row.secretaria]),
      [
        [
          '1000',
          {
            status: 'found',
            nome: 'Secretaria Municipal de Trabalho',
            sigla: 'SMTE',
          },
        ],
        ['2000', { status: 'unavailable' }],
        [null, null],
      ]
    )
    assert.equal(result.summary.secretariasWithoutName, 1)
    assert.equal(result.summary.totals.publishedCourses, 4)
  })

  test('RMI travada não segura o consolidado: totais saem no prazo dos nomes', async () => {
    const started = Date.now()
    const result = await buildCoursesDashboard({
      enrollmentCountOptions: countOptions(),
      listPublishedCoursesPage: async () =>
        coursesPage(
          [
            { id: 1, orgao_id: '1000' },
            { id: 2, orgao_id: '2000' },
          ],
          2,
          1
        ),
      fetchCourseEnrollments: async id => enrollmentsPage(id * 10),
      resolveSecretarias: ids =>
        resolveDepartmentNames(ids, () => new Promise(() => {}), {
          cache: new DepartmentNameCache(),
          deadlineMs: 200,
        }),
    })
    const elapsed = Date.now() - started
    assert.ok(elapsed < 1500, `levou ${elapsed} ms`)
    assert.ok(result.ok)
    assert.deepEqual(result.summary.totals, {
      publishedCourses: 2,
      totalEnrollments: 30,
      coursesWithoutEnrollmentCount: 0,
    })
    assert.equal(result.summary.secretariasWithoutName, 2)
  })

  test('falha na busca de nomes não derruba os totais', async () => {
    const result = await buildCoursesDashboard({
      enrollmentCountOptions: countOptions(),
      listPublishedCoursesPage: async () =>
        coursesPage([{ id: 1, orgao_id: '1000' }], 1, 1),
      fetchCourseEnrollments: async () => enrollmentsPage(7),
      resolveSecretarias: async () => {
        throw new Error('RMI fora do ar')
      },
    })
    assert.ok(result.ok)
    assert.deepEqual(result.summary.totals, {
      publishedCourses: 1,
      totalEnrollments: 7,
      coursesWithoutEnrollmentCount: 0,
    })
    assert.deepEqual(result.summary.secretarias[0].secretaria, {
      status: 'unavailable',
    })
    assert.equal(result.summary.secretariasWithoutName, 1)
  })
})

describe('attachSecretariaNames', () => {
  test('código sem resposta da busca de nomes conta como indisponível', () => {
    const summary = attachSecretariaNames(
      {
        secretarias: [
          {
            orgaoId: '1000',
            publishedCourses: 1,
            totalEnrollments: 0,
            coursesWithoutEnrollmentCount: 0,
          },
          {
            orgaoId: '3000',
            publishedCourses: 1,
            totalEnrollments: 0,
            coursesWithoutEnrollmentCount: 0,
          },
        ],
        totals: {
          publishedCourses: 2,
          totalEnrollments: 0,
          coursesWithoutEnrollmentCount: 0,
        },
      },
      new Map([['1000', { status: 'not_found' as const }]])
    )
    assert.deepEqual(
      summary.secretarias.map(row => row.secretaria),
      [{ status: 'not_found' }, { status: 'unavailable' }]
    )
    // Não encontrado é resposta definitiva da RMI, não falha temporária
    assert.equal(summary.secretariasWithoutName, 1)
  })
})
