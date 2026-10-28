import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-59: as abas da listagem de cursos mostram o total real de cada aba
// (pagination.total do BFF), não a quantidade de itens da página exibida.

const {
  COURSE_TAB_ENDPOINTS,
  buildCourseTabCountUrl,
  fetchCourseTabCounts,
  parseCourseTabTotal,
} = await import('../courses-tab-counts.ts')

const ORIGIN = 'https://admin.exemplo.test'
const ALL_TABS = ['created', 'in_review', 'needs_changes', 'draft'] as const

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

describe('buildCourseTabCountUrl', () => {
  test('usa o mesmo BFF da tabela de cada aba', () => {
    assert.deepEqual(COURSE_TAB_ENDPOINTS, {
      created: '/api/courses',
      in_review: '/api/courses/in-review',
      needs_changes: '/api/courses/needs-changes',
      draft: '/api/courses/drafts',
    })
    for (const tab of ALL_TABS) {
      const url = new URL(buildCourseTabCountUrl(tab, {}, ORIGIN))
      assert.equal(url.origin, ORIGIN)
      assert.equal(url.pathname, COURSE_TAB_ENDPOINTS[tab])
    }
  })

  test('pede uma página de 1 item, só para ler o total', () => {
    const url = new URL(buildCourseTabCountUrl('draft', {}, ORIGIN))
    assert.equal(url.searchParams.get('page'), '1')
    assert.equal(url.searchParams.get('per_page'), '1')
    assert.equal(url.searchParams.has('search'), false)
  })

  test('aplica a mesma busca da tabela, sem espaços nas pontas', () => {
    const url = new URL(
      buildCourseTabCountUrl(
        'created',
        { search: ' excel & planilhas ' },
        ORIGIN
      )
    )
    assert.equal(url.searchParams.get('search'), 'excel & planilhas')
  })

  test('ignora busca vazia', () => {
    const url = new URL(
      buildCourseTabCountUrl('in_review', { search: '   ' }, ORIGIN)
    )
    assert.equal(url.searchParams.has('search'), false)
  })
})

describe('parseCourseTabTotal', () => {
  test('lê pagination.total', () => {
    assert.equal(
      parseCourseTabTotal({
        courses: [{}],
        pagination: { total: 37 },
        total: 37,
      }),
      37
    )
    assert.equal(
      parseCourseTabTotal({ courses: [], pagination: { total: 0 } }),
      0
    )
  })

  test('não usa o total da raiz (no BFF de rascunhos ele pode ser o tamanho da página)', () => {
    assert.equal(
      parseCourseTabTotal({ courses: [{}], pagination: null, total: 1 }),
      null
    )
  })

  test('rejeita resposta sem total válido', () => {
    assert.equal(parseCourseTabTotal(null), null)
    assert.equal(parseCourseTabTotal('37'), null)
    assert.equal(parseCourseTabTotal({ courses: [] }), null)
    assert.equal(parseCourseTabTotal({ pagination: {} }), null)
    assert.equal(parseCourseTabTotal({ pagination: { total: '37' } }), null)
    assert.equal(parseCourseTabTotal({ pagination: { total: -1 } }), null)
    assert.equal(parseCourseTabTotal({ pagination: { total: 2.5 } }), null)
  })
})

describe('fetchCourseTabCounts', () => {
  test('consulta cada aba e usa o total do backend, não a página', async () => {
    const totals: Record<string, number> = {
      '/api/courses': 120,
      '/api/courses/in-review': 8,
      '/api/courses/needs-changes': 0,
      '/api/courses/drafts': 15,
    }
    const requested: string[] = []
    const fetchFn = async (input: string) => {
      const url = new URL(input)
      requested.push(url.pathname)
      // A página tem no máximo 1 item; o total vem de pagination.total
      return jsonResponse({
        courses: [{ id: 'x' }],
        pagination: { total: totals[url.pathname] },
        total: totals[url.pathname],
      })
    }

    const counts = await fetchCourseTabCounts(
      ALL_TABS,
      { search: 'excel' },
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, {
      created: 120,
      in_review: 8,
      needs_changes: 0,
      draft: 15,
    })
    assert.deepEqual([...requested].sort(), Object.keys(totals).sort())
  })

  test('só consulta as abas pedidas (aprovador não tem "Em edição")', async () => {
    const requested: string[] = []
    const fetchFn = async (input: string) => {
      requested.push(new URL(input).pathname)
      return jsonResponse({ pagination: { total: 2 } })
    }

    const counts = await fetchCourseTabCounts(
      ['created', 'in_review', 'draft'],
      {},
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, { created: 2, in_review: 2, draft: 2 })
    assert.equal(requested.includes('/api/courses/needs-changes'), false)
  })

  test('falha de uma aba não derruba as demais', async () => {
    const fetchFn = async (input: string) => {
      const path = new URL(input).pathname
      if (path === '/api/courses/in-review') {
        throw new Error('rede indisponível')
      }
      if (path === '/api/courses/needs-changes') {
        return jsonResponse({ error: 'Não autenticado' }, false)
      }
      if (path === '/api/courses/drafts') {
        return jsonResponse({ courses: [], pagination: null, total: 0 })
      }
      return jsonResponse({ pagination: { total: 5 } })
    }

    const counts = await fetchCourseTabCounts(ALL_TABS, {}, fetchFn, ORIGIN)

    assert.deepEqual(counts, { created: 5 })
  })

  test('repassa o AbortSignal para cancelar consultas antigas', async () => {
    const controller = new AbortController()
    const signals: (AbortSignal | undefined)[] = []
    const fetchFn = async (_input: string, init?: { signal?: AbortSignal }) => {
      signals.push(init?.signal)
      return jsonResponse({ pagination: { total: 1 } })
    }

    await fetchCourseTabCounts(
      ['created'],
      {},
      fetchFn,
      ORIGIN,
      controller.signal
    )

    assert.deepEqual(signals, [controller.signal])
  })
})
