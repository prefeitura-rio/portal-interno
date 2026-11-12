import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  CATALOGO_PAGE_SIZE_MAX,
  getVagaHabilidadesDaVaga,
  getVagaHabilidadesParaApi,
  parseAreaAtuacaoId,
  parseCatalogoListParams,
  toCatalogoHabilidadesPage,
} from '../vaga-habilidades.ts'

// DEV-525: a vaga envia e recebe as áreas de atuação (cada uma com os seus
// conhecimentos) e os comportamentos no formato da DEV-524, e as rotas de
// catálogo do BFF validam q, page e pageSize.

/** Vaga como o GET /api/v1/empregabilidade/vagas/{id} devolve (sintética). */
const VAGA_COM_HABILIDADES = {
  id: 'vaga-sintetica-1',
  areas_atuacao: [
    {
      id_area_atuacao: 3,
      nome: 'Tecnologia da Informação',
      conhecimento_ids: [10, 11],
      conhecimentos: [
        { id: 10, nome: 'Java' },
        { id: 11, nome: 'SQL' },
      ],
    },
    {
      id_area_atuacao: 5,
      nome: 'Administração',
      conhecimento_ids: [20],
      conhecimentos: [{ id: 20, nome: 'Planilhas' }],
    },
  ],
  comportamento_atitudes_ids: [1, 2],
  comportamentos_atitudes: [
    { id: 1, nome: 'Proatividade' },
    { id: 2, nome: 'Trabalho em equipe' },
  ],
}

describe('getVagaHabilidadesDaVaga', () => {
  test('lê as áreas com conhecimentos e os comportamentos, com os nomes', () => {
    assert.deepEqual(getVagaHabilidadesDaVaga(VAGA_COM_HABILIDADES), {
      areas_atuacao: VAGA_COM_HABILIDADES.areas_atuacao,
      comportamento_atitudes_ids: [1, 2],
      comportamentos_atitudes: VAGA_COM_HABILIDADES.comportamentos_atitudes,
    })
  })

  test('vaga sem registro (listas vazias da API) lê vazio', () => {
    assert.deepEqual(
      getVagaHabilidadesDaVaga({
        areas_atuacao: [],
        comportamento_atitudes_ids: [],
        comportamentos_atitudes: [],
      }),
      { areas_atuacao: [], comportamento_atitudes_ids: [] }
    )
  })

  test('lista ausente na resposta fica undefined (não será enviada)', () => {
    assert.deepEqual(getVagaHabilidadesDaVaga({ id: 'x' }), {})
    assert.deepEqual(
      getVagaHabilidadesDaVaga({ areas_atuacao: null, titulo: 'x' }),
      {}
    )
  })

  test('descarta ids inválidos e junta área repetida', () => {
    assert.deepEqual(
      getVagaHabilidadesDaVaga({
        areas_atuacao: [
          { id_area_atuacao: 3, conhecimento_ids: [10, 10, -1, '11', 1.5] },
          { id_area_atuacao: 0, conhecimento_ids: [99] },
          null,
          { id_area_atuacao: 3, conhecimento_ids: [12, 10] },
        ],
        comportamento_atitudes_ids: [2, 2, 'x', 0, 4],
      }),
      {
        areas_atuacao: [{ id_area_atuacao: 3, conhecimento_ids: [10, 12] }],
        comportamento_atitudes_ids: [2, 4],
      }
    )
  })
})

describe('getVagaHabilidadesParaApi', () => {
  test('envia só os ids, no formato da DEV-524', () => {
    assert.deepEqual(
      getVagaHabilidadesParaApi(getVagaHabilidadesDaVaga(VAGA_COM_HABILIDADES)),
      {
        areas_atuacao: [
          { id_area_atuacao: 3, conhecimento_ids: [10, 11] },
          { id_area_atuacao: 5, conhecimento_ids: [20] },
        ],
        comportamento_atitudes_ids: [1, 2],
      }
    )
  })

  test('lista undefined fica de fora (o PUT mantém o gravado)', () => {
    assert.deepEqual(getVagaHabilidadesParaApi(undefined), {})
    assert.deepEqual(getVagaHabilidadesParaApi(null), {})
    assert.deepEqual(getVagaHabilidadesParaApi({}), {})
    assert.deepEqual(
      getVagaHabilidadesParaApi({ comportamento_atitudes_ids: [7] }),
      { comportamento_atitudes_ids: [7] }
    )
  })

  test('lista vazia é enviada vazia (apaga o conjunto)', () => {
    assert.deepEqual(
      getVagaHabilidadesParaApi({
        areas_atuacao: [],
        comportamento_atitudes_ids: [],
      }),
      { areas_atuacao: [], comportamento_atitudes_ids: [] }
    )
  })

  test('área sem conhecimento segue (o rascunho aceita) e área repetida é juntada', () => {
    assert.deepEqual(
      getVagaHabilidadesParaApi({
        areas_atuacao: [
          { id_area_atuacao: 8, conhecimento_ids: [] },
          { id_area_atuacao: 3, conhecimento_ids: [1] },
          { id_area_atuacao: 3, conhecimento_ids: [2, 1] },
        ],
      }),
      {
        areas_atuacao: [
          { id_area_atuacao: 8, conhecimento_ids: [] },
          { id_area_atuacao: 3, conhecimento_ids: [1, 2] },
        ],
      }
    )
  })

  test('não envia os nomes (a API os ignora na entrada)', () => {
    const corpo = getVagaHabilidadesParaApi({
      areas_atuacao: [
        {
          id_area_atuacao: 3,
          nome: 'Tecnologia da Informação',
          conhecimento_ids: [10],
          conhecimentos: [{ id: 10, nome: 'Java' }],
        },
      ],
      comportamento_atitudes_ids: [1],
      comportamentos_atitudes: [{ id: 1, nome: 'Proatividade' }],
    })
    assert.equal(JSON.stringify(corpo).includes('nome'), false)
    assert.equal('comportamentos_atitudes' in corpo, false)
  })
})

describe('parseCatalogoListParams', () => {
  const parse = (query: string) =>
    parseCatalogoListParams(new URLSearchParams(query))

  test('sem parâmetros usa página 1 com 20 itens', () => {
    assert.deepEqual(parse(''), {
      ok: true,
      params: { page: 1, pageSize: 20 },
    })
  })

  test('aceita q, page e pageSize válidos; q vazio é ignorado', () => {
    assert.deepEqual(parse('q=%20tec%20&page=2&pageSize=100'), {
      ok: true,
      params: { q: 'tec', page: 2, pageSize: 100 },
    })
    assert.deepEqual(parse('q=%20%20&page=3'), {
      ok: true,
      params: { page: 3, pageSize: 20 },
    })
  })

  test('recusa page e pageSize inválidos', () => {
    for (const query of [
      'page=0',
      'page=-1',
      'page=1.5',
      'page=abc',
      'page=1e3',
      `pageSize=${CATALOGO_PAGE_SIZE_MAX + 1}`,
      'pageSize=0',
      'pageSize=dez',
      'page=99999999999999999999',
    ]) {
      const result = parse(query)
      assert.equal(result.ok, false, query)
    }
  })

  test('recusa q muito longo', () => {
    assert.equal(parse(`q=${'a'.repeat(101)}`).ok, false)
    assert.equal(parse(`q=${'a'.repeat(100)}`).ok, true)
  })
})

describe('parseAreaAtuacaoId', () => {
  test('só inteiro positivo', () => {
    assert.equal(parseAreaAtuacaoId('3'), 3)
    for (const raw of ['', '0', '-3', '3.5', 'abc', '3;drop', '1e2']) {
      assert.equal(parseAreaAtuacaoId(raw), null, raw)
    }
  })
})

describe('toCatalogoHabilidadesPage', () => {
  test('converte a resposta paginada da API em data e meta', () => {
    assert.deepEqual(
      toCatalogoHabilidadesPage(
        {
          data: [
            { id: 1, nome: 'Proatividade' },
            { id: 0, nome: 'inválido' },
            { nome: 'sem id' },
          ],
          page: 2,
          pageSize: 10,
          total: 31,
        },
        { page: 2, pageSize: 10 }
      ),
      {
        data: [{ id: 1, nome: 'Proatividade' }],
        meta: { page: 2, page_size: 10, total: 31 },
      }
    )
  })

  test('resposta sem os campos cai nos parâmetros pedidos', () => {
    assert.deepEqual(
      toCatalogoHabilidadesPage(null, { page: 1, pageSize: 20 }),
      {
        data: [],
        meta: { page: 1, page_size: 20, total: 0 },
      }
    )
  })
})
