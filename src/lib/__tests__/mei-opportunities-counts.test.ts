import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-59: as abas da listagem de oportunidades MEI mostram o total real de
// cada status (meta.total do BFF), não a quantidade de itens da página.

const {
  MEI_COUNT_STATUSES,
  buildMEIOpportunityCountUrl,
  fetchMEIOpportunityCountsByStatus,
  parseMEIOpportunityTotal,
} = await import('../mei-opportunities-counts.ts')

const ORIGIN = 'https://admin.exemplo.test'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

describe('buildMEIOpportunityCountUrl', () => {
  test('pede uma página de 1 item do status, só para ler o total', () => {
    const url = new URL(buildMEIOpportunityCountUrl('expired', {}, ORIGIN))
    assert.equal(url.origin, ORIGIN)
    assert.equal(url.pathname, '/api/oportunidades-mei')
    assert.equal(url.searchParams.get('status'), 'expired')
    assert.equal(url.searchParams.get('page'), '1')
    assert.equal(url.searchParams.get('page_size'), '1')
    assert.equal(url.searchParams.has('orgao_id'), false)
    assert.equal(url.searchParams.has('titulo'), false)
  })

  test('aplica os mesmos filtros de órgão e busca da tabela', () => {
    const url = new URL(
      buildMEIOpportunityCountUrl(
        'active',
        { orgaoId: 1234, titulo: ' pintura & reparos ' },
        ORIGIN
      )
    )
    assert.equal(url.searchParams.get('orgao_id'), '1234')
    assert.equal(url.searchParams.get('titulo'), 'pintura & reparos')
  })

  test('ignora filtros vazios ou inválidos', () => {
    for (const orgaoId of [undefined, 0, -3, 1.5, Number.NaN]) {
      const url = new URL(
        buildMEIOpportunityCountUrl('draft', { orgaoId, titulo: '  ' }, ORIGIN)
      )
      assert.equal(url.searchParams.has('orgao_id'), false)
      assert.equal(url.searchParams.has('titulo'), false)
    }
  })
})

describe('parseMEIOpportunityTotal', () => {
  test('lê meta.total', () => {
    assert.equal(
      parseMEIOpportunityTotal({ data: [{}], meta: { total: 12 } }),
      12
    )
    assert.equal(parseMEIOpportunityTotal({ data: [], meta: { total: 0 } }), 0)
  })

  test('rejeita resposta sem total válido', () => {
    assert.equal(parseMEIOpportunityTotal(null), null)
    assert.equal(parseMEIOpportunityTotal('12'), null)
    assert.equal(parseMEIOpportunityTotal({ data: [] }), null)
    assert.equal(parseMEIOpportunityTotal({ meta: null }), null)
    assert.equal(parseMEIOpportunityTotal({ meta: { total: '12' } }), null)
    assert.equal(parseMEIOpportunityTotal({ meta: { total: -1 } }), null)
    assert.equal(parseMEIOpportunityTotal({ meta: { total: 0.5 } }), null)
  })
})

describe('fetchMEIOpportunityCountsByStatus', () => {
  test('consulta os três status e usa o total do backend, não a página', async () => {
    const totals: Record<string, number> = {
      active: 12,
      expired: 30,
      draft: 4,
    }
    const requested: string[] = []
    const fetchFn = async (input: string) => {
      const status = new URL(input).searchParams.get('status') ?? ''
      requested.push(status)
      return jsonResponse({
        data: [{ id: 1 }],
        meta: { total: totals[status] },
      })
    }

    const counts = await fetchMEIOpportunityCountsByStatus(
      MEI_COUNT_STATUSES,
      { orgaoId: 1234 },
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, totals)
    assert.deepEqual([...requested].sort(), ['active', 'draft', 'expired'])
  })

  test('falha de um status não derruba os demais', async () => {
    const fetchFn = async (input: string) => {
      const status = new URL(input).searchParams.get('status')
      if (status === 'expired') throw new Error('rede indisponível')
      if (status === 'draft') return jsonResponse({ error: 'x' }, false)
      return jsonResponse({ meta: { total: 9 } })
    }

    const counts = await fetchMEIOpportunityCountsByStatus(
      MEI_COUNT_STATUSES,
      {},
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, { active: 9 })
  })

  test('repassa o AbortSignal para cancelar consultas antigas', async () => {
    const controller = new AbortController()
    const signals: (AbortSignal | undefined)[] = []
    const fetchFn = async (_input: string, init?: { signal?: AbortSignal }) => {
      signals.push(init?.signal)
      return jsonResponse({ meta: { total: 1 } })
    }

    await fetchMEIOpportunityCountsByStatus(
      ['active'],
      {},
      fetchFn,
      ORIGIN,
      controller.signal
    )

    assert.deepEqual(signals, [controller.signal])
  })
})
