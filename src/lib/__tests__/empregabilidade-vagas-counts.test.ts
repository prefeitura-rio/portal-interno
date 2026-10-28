import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-29: as abas da listagem de vagas mostram o total real de cada status
// (meta.total do BFF), não a quantidade de itens da página exibida.

const {
  VAGA_COUNT_STATUSES,
  buildVagaCountUrl,
  fetchVagaCountsByStatus,
  formatTabLabelWithCount,
  parseVagaTotal,
} = await import('../empregabilidade-vagas-counts.ts')

const ORIGIN = 'https://admin.exemplo.test'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

describe('buildVagaCountUrl', () => {
  test('pede uma página de 1 item do status, só para ler o total', () => {
    const url = new URL(buildVagaCountUrl('em_aprovacao', {}, ORIGIN))
    assert.equal(url.origin, ORIGIN)
    assert.equal(url.pathname, '/api/empregabilidade/vagas')
    assert.equal(url.searchParams.get('status'), 'em_aprovacao')
    assert.equal(url.searchParams.get('page'), '1')
    assert.equal(url.searchParams.get('page_size'), '1')
    assert.equal(url.searchParams.has('company_id'), false)
    assert.equal(url.searchParams.has('search'), false)
  })

  test('aplica os mesmos filtros de empresa e busca da tabela', () => {
    const url = new URL(
      buildVagaCountUrl(
        'publicado_ativo',
        { companyId: ' empresa-1 ', search: ' auxiliar & cia ' },
        ORIGIN
      )
    )
    assert.equal(url.searchParams.get('company_id'), 'empresa-1')
    assert.equal(url.searchParams.get('search'), 'auxiliar & cia')
  })

  test('ignora filtros vazios', () => {
    const url = new URL(
      buildVagaCountUrl('em_edicao', { companyId: '  ', search: '' }, ORIGIN)
    )
    assert.equal(url.searchParams.has('company_id'), false)
    assert.equal(url.searchParams.has('search'), false)
  })
})

describe('parseVagaTotal', () => {
  test('lê meta.total', () => {
    assert.equal(parseVagaTotal({ data: [{}], meta: { total: 20 } }), 20)
    assert.equal(parseVagaTotal({ data: [], meta: { total: 0 } }), 0)
  })

  test('rejeita resposta sem total válido', () => {
    assert.equal(parseVagaTotal(null), null)
    assert.equal(parseVagaTotal('20'), null)
    assert.equal(parseVagaTotal({ data: [] }), null)
    assert.equal(parseVagaTotal({ meta: null }), null)
    assert.equal(parseVagaTotal({ meta: { total: '20' } }), null)
    assert.equal(parseVagaTotal({ meta: { total: -1 } }), null)
    assert.equal(parseVagaTotal({ meta: { total: 1.5 } }), null)
  })
})

describe('fetchVagaCountsByStatus', () => {
  test('consulta todos os status e usa o total do backend, não a página', async () => {
    const totals: Record<string, number> = {
      publicado_ativo: 20,
      publicado_expirado: 3,
      em_aprovacao: 7,
      em_edicao: 0,
      vaga_congelada: 1,
      vaga_descontinuada: 42,
    }
    const requested: string[] = []
    const fetchFn = async (input: string) => {
      const url = new URL(input)
      const status = url.searchParams.get('status') ?? ''
      requested.push(status)
      // A página tem no máximo 1 item; o total vem de meta.total
      return jsonResponse({
        data: [{ id: 'x' }],
        meta: { total: totals[status] },
      })
    }

    const counts = await fetchVagaCountsByStatus(
      VAGA_COUNT_STATUSES,
      { companyId: 'empresa-1' },
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, totals)
    assert.deepEqual([...requested].sort(), [...VAGA_COUNT_STATUSES].sort())
  })

  test('falha de um status não derruba os demais', async () => {
    const fetchFn = async (input: string) => {
      const status = new URL(input).searchParams.get('status')
      if (status === 'em_aprovacao') throw new Error('rede indisponível')
      if (status === 'em_edicao') return jsonResponse({ error: 'x' }, false)
      if (status === 'vaga_congelada') return jsonResponse({ data: [] })
      return jsonResponse({ meta: { total: 5 } })
    }

    const counts = await fetchVagaCountsByStatus(
      VAGA_COUNT_STATUSES,
      {},
      fetchFn,
      ORIGIN
    )

    assert.deepEqual(counts, {
      publicado_ativo: 5,
      publicado_expirado: 5,
      vaga_descontinuada: 5,
    })
  })

  test('repassa o AbortSignal para cancelar consultas antigas', async () => {
    const controller = new AbortController()
    const signals: (AbortSignal | undefined)[] = []
    const fetchFn = async (_input: string, init?: { signal?: AbortSignal }) => {
      signals.push(init?.signal)
      return jsonResponse({ meta: { total: 1 } })
    }

    await fetchVagaCountsByStatus(
      ['publicado_ativo'],
      {},
      fetchFn,
      ORIGIN,
      controller.signal
    )

    assert.deepEqual(signals, [controller.signal])
  })
})

describe('formatTabLabelWithCount', () => {
  test('mostra a contagem ao lado do título', () => {
    assert.equal(
      formatTabLabelWithCount('Vagas ativas', 20),
      'Vagas ativas (20)'
    )
    assert.equal(formatTabLabelWithCount('Rascunhos', 0), 'Rascunhos (0)')
  })

  test('sem contagem disponível, mantém só o título', () => {
    assert.equal(
      formatTabLabelWithCount('Vagas ativas', undefined),
      'Vagas ativas'
    )
  })
})
