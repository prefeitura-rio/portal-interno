import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-147: a lista de tombamentos é percorrida inteira e agrupada sem perder
// registros, para que um serviço com dois tombamentos mostre e remova os dois.

const {
  TOMBAMENTOS_PAGE_SIZE,
  compareTombamentoAge,
  createKeyedLock,
  findTombamentosByNewService,
  groupTombamentosByNewService,
  listAllTombamentos,
  pickSurvivingTombamento,
  waitForTombamentoVisible,
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

describe('compareTombamentoAge e pickSurvivingTombamento', () => {
  test('ids sequenciais do Typesense: vale o valor numérico, não o texto', () => {
    assert.ok(
      compareTombamentoAge(tombamento('9', 's'), tombamento('10', 's')) < 0
    )
    assert.ok(
      compareTombamentoAge(tombamento('100', 's'), tombamento('99', 's')) > 0
    )
    assert.equal(
      compareTombamentoAge(tombamento('7', 's'), tombamento('7', 's')),
      0
    )
  })

  test('ids não numéricos: criado_em e, empatando, o id como texto', () => {
    assert.ok(
      compareTombamentoAge(
        { id: 'b', id_servico_novo: 's', criado_em: 10 },
        { id: 'a', id_servico_novo: 's', criado_em: 20 }
      ) < 0
    )
    assert.ok(
      compareTombamentoAge(
        { id: 'a', id_servico_novo: 's', criado_em: 10 },
        { id: 'b', id_servico_novo: 's', criado_em: 10 }
      ) < 0
    )
  })

  test('fica o mais antigo, em qualquer ordem de chegada', () => {
    const items = [
      tombamento('1002', 's'),
      tombamento('998', 's'),
      tombamento('1000', 's'),
    ]
    assert.equal(pickSurvivingTombamento(items)?.id, '998')
    assert.equal(pickSurvivingTombamento([...items].reverse())?.id, '998')
    assert.equal(pickSurvivingTombamento([]), undefined)
  })
})

describe('waitForTombamentoVisible', () => {
  const noSleep = async () => undefined

  test('relê até o registro aparecer e devolve a leitura em que apareceu', async () => {
    let reads = 0
    const result = await waitForTombamentoVisible(
      async () => {
        reads++
        return reads < 3
          ? [tombamento('1', 's')]
          : [tombamento('1', 's'), tombamento('2', 's')]
      },
      '2',
      5,
      0,
      noSleep
    )
    assert.equal(reads, 3)
    assert.deepEqual(
      result?.map(item => item.id),
      ['1', '2']
    )
  })

  test('leitura que falha conta como "ainda não apareceu"', async () => {
    let reads = 0
    const result = await waitForTombamentoVisible(
      async () => {
        reads++
        if (reads === 1) throw new Error('falha sintética')
        return [tombamento('2', 's')]
      },
      '2',
      5,
      0,
      noSleep
    )
    assert.equal(reads, 2)
    assert.deepEqual(
      result?.map(item => item.id),
      ['2']
    )
  })

  test('sem aparecer no limite de leituras: null', async () => {
    let reads = 0
    const sleeps: number[] = []
    const result = await waitForTombamentoVisible(
      async () => {
        reads++
        return []
      },
      '2',
      4,
      250,
      async ms => {
        sleeps.push(ms)
      }
    )
    assert.equal(result, null)
    assert.equal(reads, 4)
    assert.deepEqual(sleeps, [250, 250, 250])
  })
})

describe('createKeyedLock', () => {
  test('mesma chave roda uma de cada vez, na ordem de chegada; chave diferente não espera', async () => {
    const withLock = createKeyedLock()
    const events: string[] = []
    let releaseFirst: () => void = () => undefined
    const firstGate = new Promise<void>(resolve => {
      releaseFirst = resolve
    })

    const first = withLock('s', async () => {
      events.push('a:start')
      await firstGate
      events.push('a:end')
      return 'a'
    })
    const second = withLock('s', async () => {
      events.push('b:start')
      return 'b'
    })
    const other = withLock('outro', async () => {
      events.push('c:start')
      return 'c'
    })

    assert.equal(await other, 'c')
    assert.deepEqual(events, ['a:start', 'c:start'])
    releaseFirst()
    assert.deepEqual(await Promise.all([first, second]), ['a', 'b'])
    assert.deepEqual(events, ['a:start', 'c:start', 'a:end', 'b:start'])
  })

  test('uma tarefa que falha não trava as seguintes da mesma chave', async () => {
    const withLock = createKeyedLock()
    const failing = withLock('s', async () => {
      throw new Error('falha sintética')
    })
    await assert.rejects(failing, /falha sintética/)
    assert.equal(await withLock('s', async () => 'ok'), 'ok')
  })
})
