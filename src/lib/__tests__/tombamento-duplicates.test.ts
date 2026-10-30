import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-147: a lista de tombamentos é percorrida inteira e agrupada sem perder
// registros, para que um serviço com dois tombamentos mostre e remova os dois.

const {
  TOMBAMENTOS_PAGE_SIZE,
  findTombamentosByNewService,
  groupTombamentosByNewService,
  listAllTombamentos,
} = await import('../tombamento-duplicates.ts')

interface TombamentoStub {
  id: string
  id_servico_novo: string
}

function tombamento(id: string, idServicoNovo: string): TombamentoStub {
  return { id, id_servico_novo: idServicoNovo }
}

function pagedSource(total: number, perPageCap = Number.POSITIVE_INFINITY) {
  const all = Array.from({ length: total }, (_, index) =>
    tombamento(`t-${index}`, `servico-${index % 7}`)
  )
  const calls: { page: number; perPage: number }[] = []
  async function fetchPage(page: number, perPage: number) {
    calls.push({ page, perPage })
    const size = Math.min(perPage, perPageCap)
    const start = (page - 1) * size
    return { found: total, tombamentos: all.slice(start, start + size) }
  }
  return { all, calls, fetchPage }
}

describe('listAllTombamentos', () => {
  test('percorre todas as páginas além das 100 primeiras', async () => {
    const { all, calls, fetchPage } = pagedSource(250)
    const result = await listAllTombamentos(fetchPage)
    assert.deepEqual(result, all)
    assert.deepEqual(
      calls.map(call => call.page),
      [1, 2, 3]
    )
    assert.ok(calls.every(call => call.perPage === TOMBAMENTOS_PAGE_SIZE))
  })

  test('para quando chega ao total, sem pedir página vazia', async () => {
    const { calls, fetchPage } = pagedSource(200)
    const result = await listAllTombamentos(fetchPage)
    assert.equal(result.length, 200)
    assert.equal(calls.length, 2)
  })

  test('lista vazia ou sem o campo tombamentos: uma chamada só', async () => {
    let calls = 0
    const result = await listAllTombamentos(async () => {
      calls++
      return { found: 0, tombamentos: null }
    })
    assert.deepEqual(result, [])
    assert.equal(calls, 1)
  })

  test('falha de uma página propaga o erro, nunca devolve lista parcial', async () => {
    await assert.rejects(
      listAllTombamentos(async page => {
        if (page === 2) throw new Error('busca fora do ar')
        return {
          found: 150,
          tombamentos: Array.from({ length: 100 }, (_, index) =>
            tombamento(`t-${index}`, 'servico')
          ),
        }
      }),
      /busca fora do ar/
    )
  })

  test('lista maior que o limite de páginas é erro, não lista truncada', async () => {
    const { fetchPage } = pagedSource(50)
    await assert.rejects(listAllTombamentos(fetchPage, 10, 3), /maior que 30/)
  })
})

describe('findTombamentosByNewService', () => {
  test('devolve todos os tombamentos do serviço novo, inclusive duplicados', () => {
    const list = [
      tombamento('a', 'servico-1'),
      tombamento('b', 'servico-2'),
      tombamento('c', 'servico-1'),
    ]
    assert.deepEqual(
      findTombamentosByNewService(list, 'servico-1').map(item => item.id),
      ['a', 'c']
    )
    assert.deepEqual(findTombamentosByNewService(list, 'servico-3'), [])
  })
})

describe('groupTombamentosByNewService', () => {
  test('não descarta o registro extra de um serviço com dois tombamentos', () => {
    const grouped = groupTombamentosByNewService([
      tombamento('a', 'servico-1'),
      tombamento('b', 'servico-2'),
      tombamento('c', 'servico-1'),
    ])
    assert.deepEqual(
      grouped.get('servico-1')?.map(item => item.id),
      ['a', 'c']
    )
    assert.deepEqual(
      grouped.get('servico-2')?.map(item => item.id),
      ['b']
    )
    assert.equal(grouped.size, 2)
  })
})
