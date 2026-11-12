import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-526: regras do bloco "Habilidades e competências" (grupos de área,
// badges, validação) e a leitura do catálogo inteiro.

registerSrcLoader()
const bloco = await import('../vaga-habilidades-bloco.ts')
const { fetchCatalogoCompleto, CATALOGO_COMPLETO_PAGE_SIZE } = await import(
  '../../hooks/use-vaga-habilidades-catalogos.ts'
)

const TI = 3
const ADM = 5
const SAUDE = 8

describe('grupos de área', () => {
  const areas = [
    { id_area_atuacao: TI, conhecimento_ids: [10, 11] },
    { id_area_atuacao: ADM, conhecimento_ids: [20] },
  ]

  test('área usada em outro grupo fica desabilitada, a do próprio não', () => {
    const usadasNoPrimeiro = bloco.getAreasUsadasEmOutrosGrupos(areas, 0)
    assert.deepEqual([...usadasNoPrimeiro], [ADM])
    const usadasNoNovo = bloco.getAreasUsadasEmOutrosGrupos(areas, 2)
    assert.deepEqual([...usadasNoNovo].sort(), [TI, ADM].sort())
  })

  test('trocar a área limpa só os conhecimentos daquele grupo', () => {
    const trocadas = bloco.trocarAreaDoGrupo(areas, 0, SAUDE)
    assert.deepEqual(trocadas, [
      { id_area_atuacao: SAUDE, conhecimento_ids: [] },
      { id_area_atuacao: ADM, conhecimento_ids: [20] },
    ])
    assert.deepEqual(areas[0].conhecimento_ids, [10, 11], 'não muta a lista')
  })

  test('escolher a área do grupo novo acrescenta o grupo', () => {
    assert.deepEqual(bloco.trocarAreaDoGrupo(areas, 2, SAUDE), [
      ...areas,
      { id_area_atuacao: SAUDE, conhecimento_ids: [] },
    ])
  })

  test('área de outro grupo é recusada; a mesma área não limpa nada', () => {
    assert.equal(bloco.trocarAreaDoGrupo(areas, 0, ADM), areas)
    assert.equal(bloco.trocarAreaDoGrupo(areas, 0, TI), areas)
  })

  test('remover grupo tira a área e os seus conhecimentos', () => {
    assert.deepEqual(bloco.removerGrupo(areas, 0), [
      { id_area_atuacao: ADM, conhecimento_ids: [20] },
    ])
  })

  test('conhecimentos mudam só no grupo indicado, sem repetir', () => {
    assert.deepEqual(bloco.setConhecimentosDoGrupo(areas, 1, [21, 21, 22]), [
      areas[0],
      { id_area_atuacao: ADM, conhecimento_ids: [21, 22] },
    ])
  })

  test('"Adicionar outra área" só com o último grupo completo', () => {
    assert.equal(
      bloco.podeAdicionarArea({ areas, grupoNovoAberto: false }),
      true
    )
    assert.equal(
      bloco.podeAdicionarArea({ areas: [], grupoNovoAberto: false }),
      false,
      'sem área: o grupo vazio já está aberto'
    )
    assert.equal(
      bloco.podeAdicionarArea({ areas, grupoNovoAberto: true }),
      false,
      'grupo novo sem área'
    )
    assert.equal(
      bloco.podeAdicionarArea({
        areas: [...areas, { id_area_atuacao: SAUDE, conhecimento_ids: [] }],
        grupoNovoAberto: false,
      }),
      false,
      'último grupo sem conhecimento'
    )
    assert.equal(
      bloco.podeAdicionarArea({
        areas,
        grupoNovoAberto: false,
        totalAreasCatalogo: 2,
      }),
      false,
      'todas as áreas do catálogo já usadas'
    )
  })
})

describe('badges', () => {
  test('ordem A–Z sem diferenciar acento nem caixa', () => {
    const itens = [
      { id: 1, nome: 'Trabalho em equipe' },
      { id: 2, nome: 'ética' },
      { id: 3, nome: 'Empatia' },
      { id: 4, nome: 'Ágil' },
    ]
    assert.deepEqual(
      bloco.ordenarPorNome(itens).map(item => item.nome),
      ['Ágil', 'Empatia', 'ética', 'Trabalho em equipe']
    )
  })

  test('nome do catálogo, senão o gravado na vaga, senão o id', () => {
    assert.deepEqual(
      bloco.getItensSelecionados(
        [11, 10, 12, 10],
        [{ id: 10, nome: 'SQL' }],
        [
          { id: 10, nome: 'nome antigo' },
          { id: 11, nome: 'Java' },
        ]
      ),
      [
        { id: 12, nome: '#12' },
        { id: 11, nome: 'Java' },
        { id: 10, nome: 'SQL' },
      ]
    )
  })

  test('até 9 badges por campo, o resto no "+N mais"', () => {
    const itens = Array.from({ length: 12 }, (_, i) => i)
    const { visiveis, restantes } = bloco.getBadgesVisiveis(itens)
    assert.equal(bloco.HABILIDADES_MAX_DISPLAY, 9)
    assert.deepEqual(visiveis, itens.slice(0, 9))
    assert.equal(restantes, 3)
    assert.equal(bloco.getMaisItensLabel(restantes), '+3 mais')
    assert.deepEqual(bloco.getBadgesVisiveis(itens.slice(0, 9)).restantes, 0)
  })

  test('rótulos acessíveis', () => {
    assert.equal(bloco.getRemoverItemLabel('Java'), 'Remover Java')
    assert.equal(bloco.REMOVER_AREA_LABEL, 'Remover área')
  })

  test('alternar e remover id', () => {
    assert.deepEqual(bloco.alternarId([1, 2], 3), [1, 2, 3])
    assert.deepEqual(bloco.alternarId([1, 2], 1), [2])
    assert.deepEqual(bloco.removerId([1, 2], 2), [1])
  })
})

describe('getErrosHabilidades', () => {
  test('tudo preenchido: sem erro', () => {
    assert.deepEqual(
      bloco.getErrosHabilidades({
        areas: [{ id_area_atuacao: TI, conhecimento_ids: [10] }],
        comportamentoIds: [1],
      }),
      {}
    )
  })

  test('nada preenchido: área e comportamento obrigatórios', () => {
    assert.deepEqual(
      bloco.getErrosHabilidades({ areas: [], comportamentoIds: [] }),
      {
        areas: 'Selecione ao menos uma área de atuação.',
        comportamentos: 'Selecione ao menos um comportamento ou atitude.',
      }
    )
  })

  test('grupo sem conhecimento e área repetida, cada um no seu grupo', () => {
    assert.deepEqual(
      bloco.getErrosHabilidades({
        areas: [
          { id_area_atuacao: TI, conhecimento_ids: [10] },
          { id_area_atuacao: ADM, conhecimento_ids: [] },
          { id_area_atuacao: TI, conhecimento_ids: [11] },
        ],
        comportamentoIds: [1],
      }),
      {
        grupos: [
          undefined,
          { conhecimentos: 'Selecione ao menos um conhecimento desta área.' },
          { area: 'Esta área já foi adicionada em outro grupo.' },
        ],
      }
    )
  })
})

describe('fetchCatalogoCompleto', () => {
  test('lê todas as páginas de 100 até o total', async () => {
    const total = 230
    const urls: string[] = []
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      urls.push(url)
      const page = Number(new URL(url, 'http://x').searchParams.get('page'))
      const inicio = (page - 1) * CATALOGO_COMPLETO_PAGE_SIZE
      const fim = Math.min(total, inicio + CATALOGO_COMPLETO_PAGE_SIZE)
      const data = Array.from(
        { length: Math.max(0, fim - inicio) },
        (_, i) => ({
          id: inicio + i + 1,
          nome: `Item ${inicio + i + 1}`,
        })
      )
      return new Response(
        JSON.stringify({
          data,
          meta: { page, page_size: CATALOGO_COMPLETO_PAGE_SIZE, total },
        }),
        { status: 200 }
      )
    }) as typeof fetch
    try {
      const resultado = await fetchCatalogoCompleto(
        '/api/empregabilidade/comportamentos-atitudes',
        new AbortController().signal
      )
      assert.equal(resultado.data.length, total)
      assert.equal(resultado.meta.total, total)
      assert.deepEqual(urls, [
        '/api/empregabilidade/comportamentos-atitudes?page=1&pageSize=100',
        '/api/empregabilidade/comportamentos-atitudes?page=2&pageSize=100',
        '/api/empregabilidade/comportamentos-atitudes?page=3&pageSize=100',
      ])
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })

  test('erro do BFF vira erro da lista', async () => {
    const fetchOriginal = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'Erro ao buscar' }), {
        status: 502,
      })) as typeof fetch
    try {
      await assert.rejects(
        fetchCatalogoCompleto(
          '/api/empregabilidade/areas-atuacao',
          new AbortController().signal
        ),
        /Erro ao buscar/
      )
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })
})
