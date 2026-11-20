import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { VagaAreaAtuacaoSelecionada } from '../vaga-habilidades.ts'
import { registerSrcLoader } from './support/register-src-loader.ts'

// O bloco importa `./vaga-habilidades` sem extensão, como o bundler do Next:
// o loader resolve esse import antes de carregar os módulos.
registerSrcLoader()
const {
  ADICIONAR_OUTRA_AREA_LABEL,
  ADICIONAR_PRIMEIRA_AREA_LABEL,
  ERRO_AREA_DO_GRUPO,
  ERRO_AREA_OBRIGATORIA,
  ERRO_AREA_REPETIDA,
  ERRO_COMPORTAMENTO_OBRIGATORIO,
  ERRO_CONHECIMENTO_OBRIGATORIO,
  adicionarGrupo,
  alternarId,
  getAdicionarAreaLabel,
  getBadgesVisiveis,
  getErrosAreasHabilidades,
  getItensSelecionados,
  getMaisItensLabel,
  getMensagensErroAreas,
  getNomeAreaDoGrupo,
  getOpcoesAreaDoGrupo,
  getRotuloComContagem,
  getTituloGrupo,
  isGrupoCompleto,
  isOpcaoNoLimite,
  ordenarPorNome,
  podeAdicionarArea,
  podeRemoverGrupo,
  removerGrupo,
  removerId,
  setConhecimentosDoGrupo,
  trocarAreaDoGrupo,
} = await import('../vaga-habilidades-bloco.ts')
const { MAX_AREAS_ATUACAO, getVagaHabilidadesParaApi } = await import(
  '../vaga-habilidades.ts'
)

// DEV-684 (PREF-663): regras do bloco "Habilidades e competências" com
// vários grupos de área, e a validação de publicação do formulário da vaga.

const TI = { id: 3, nome: 'Tecnologia da informação' }
const ADM = { id: 5, nome: 'Administração' }
const SAUDE = { id: 8, nome: 'Saúde' }
const CATALOGO = [SAUDE, TI, ADM]

function grupo(
  id: number | null,
  conhecimento_ids: number[] = []
): VagaAreaAtuacaoSelecionada {
  return { id_area_atuacao: id, conhecimento_ids }
}

describe('ordem A–Z e badges', () => {
  test('ordena pelo nome sem diferenciar acento nem caixa', () => {
    assert.deepEqual(
      ordenarPorNome([
        { id: 1, nome: 'saúde' },
        { id: 2, nome: 'Administração' },
        { id: 3, nome: 'Ética' },
        { id: 4, nome: 'comunicação' },
      ]).map(item => item.nome),
      ['Administração', 'comunicação', 'Ética', 'saúde']
    )
  })

  test('marcados em A–Z, com o nome do catálogo, do gravado ou do id', () => {
    assert.deepEqual(
      getItensSelecionados(
        [12, 10, 99, 11, 10],
        [
          { id: 10, nome: 'SQL' },
          { id: 11, nome: 'Linux' },
        ],
        [{ id: 12, nome: 'Docker' }]
      ),
      [
        { id: 99, nome: '#99' },
        { id: 12, nome: 'Docker' },
        { id: 11, nome: 'Linux' },
        { id: 10, nome: 'SQL' },
      ]
    )
  })

  test('mostra até 9 badges e conta o resto no "+N mais"', () => {
    const itens = Array.from({ length: 12 }, (_, i) => i)
    assert.deepEqual(getBadgesVisiveis(itens), {
      visiveis: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      restantes: 3,
    })
    assert.deepEqual(getBadgesVisiveis([1, 2]), {
      visiveis: [1, 2],
      restantes: 0,
    })
    assert.equal(getMaisItensLabel(3), '+3 mais')
  })

  test('marcar, desmarcar e remover um id', () => {
    assert.deepEqual(alternarId([1, 2], 3), [1, 2, 3])
    assert.deepEqual(alternarId([1, 2, 3], 2), [1, 3])
    assert.deepEqual(removerId([1, 2, 3], 1), [2, 3])
  })

  test('no limite da API só as marcadas seguem clicáveis', () => {
    assert.equal(isOpcaoNoLimite(false, 100, 100), true)
    assert.equal(isOpcaoNoLimite(true, 100, 100), false)
    assert.equal(isOpcaoNoLimite(false, 99, 100), false)
  })

  test('rótulos com contagem e título do grupo', () => {
    assert.equal(getRotuloComContagem('Conhecimentos', 0), 'Conhecimentos')
    assert.equal(getRotuloComContagem('Conhecimentos', 3), 'Conhecimentos (3)')
    assert.equal(getTituloGrupo(0), 'Área 1')
    assert.equal(getTituloGrupo(2), 'Área 3')
  })
})

describe('grupos de área', () => {
  test('a área de outro grupo fica desabilitada ("Já adicionada")', () => {
    const areas = [grupo(TI.id, [10]), grupo(null)]
    const opcoes = getOpcoesAreaDoGrupo(CATALOGO, areas, 1)
    assert.deepEqual(
      opcoes.map(opcao => [opcao.nome, opcao.desabilitada]),
      [
        ['Administração', false],
        ['Saúde', false],
        ['Tecnologia da informação', true],
      ]
    )
    // A própria área do grupo continua escolhível nele.
    assert.equal(
      getOpcoesAreaDoGrupo(CATALOGO, areas, 0).find(o => o.id === TI.id)
        ?.desabilitada,
      false
    )
  })

  test('a área gravada que o catálogo não traz aparece com o nome gravado', () => {
    const areas = [{ ...grupo(77, [1]), nome: 'Área antiga' }]
    assert.ok(
      getOpcoesAreaDoGrupo(CATALOGO, areas, 0).some(
        opcao => opcao.id === 77 && opcao.nome === 'Área antiga'
      )
    )
    assert.equal(getNomeAreaDoGrupo(areas[0], CATALOGO), 'Área antiga')
    assert.equal(getNomeAreaDoGrupo(grupo(TI.id), CATALOGO), TI.nome)
    assert.equal(getNomeAreaDoGrupo(grupo(null), CATALOGO), undefined)
  })

  test('adicionar abre um grupo vazio no fim', () => {
    assert.deepEqual(adicionarGrupo([]), [grupo(null)])
    assert.deepEqual(adicionarGrupo([grupo(TI.id, [10])]), [
      grupo(TI.id, [10]),
      grupo(null),
    ])
  })

  test('"Adicionar outra área" só com a última área escolhida e 1 conhecimento', () => {
    assert.equal(podeAdicionarArea({ areas: [] }), true)
    assert.equal(podeAdicionarArea({ areas: [grupo(null)] }), false)
    assert.equal(podeAdicionarArea({ areas: [grupo(TI.id)] }), false)
    assert.equal(podeAdicionarArea({ areas: [grupo(TI.id, [10])] }), true)
    assert.equal(
      podeAdicionarArea({ areas: [grupo(TI.id, [10]), grupo(ADM.id)] }),
      false
    )
    assert.equal(
      podeAdicionarArea({ areas: [grupo(ADM.id), grupo(TI.id, [10])] }),
      true
    )
  })

  test('não adiciona sem área livre no catálogo nem acima do limite da API', () => {
    const duas = [grupo(TI.id, [10]), grupo(ADM.id, [20])]
    assert.equal(
      podeAdicionarArea({ areas: duas, totalAreasCatalogo: 2 }),
      false
    )
    assert.equal(
      podeAdicionarArea({ areas: duas, totalAreasCatalogo: 3 }),
      true
    )
    assert.equal(podeAdicionarArea({ areas: [], totalAreasCatalogo: 0 }), false)
    const noLimite = Array.from({ length: MAX_AREAS_ATUACAO }, (_, i) =>
      grupo(i + 1, [1])
    )
    assert.equal(podeAdicionarArea({ areas: noLimite }), false)
  })

  test('trocar a área limpa só os conhecimentos daquele grupo', () => {
    const areas = [grupo(TI.id, [10, 11]), grupo(ADM.id, [20])]
    assert.deepEqual(trocarAreaDoGrupo(areas, 0, SAUDE), [
      { id_area_atuacao: SAUDE.id, conhecimento_ids: [], nome: SAUDE.nome },
      grupo(ADM.id, [20]),
    ])
    assert.deepEqual(trocarAreaDoGrupo([grupo(null)], 0, TI), [
      { id_area_atuacao: TI.id, conhecimento_ids: [], nome: TI.nome },
    ])
  })

  test('trocar para a área de outro grupo ou para a mesma não muda nada', () => {
    const areas = [grupo(TI.id, [10]), grupo(ADM.id, [20])]
    assert.equal(trocarAreaDoGrupo(areas, 1, TI), areas)
    assert.equal(trocarAreaDoGrupo(areas, 0, TI), areas)
    assert.equal(trocarAreaDoGrupo(areas, 5, SAUDE), areas)
  })

  test('marcar conhecimentos mexe só no grupo, sem repetir', () => {
    const areas = [grupo(TI.id, [10]), grupo(ADM.id, [20])]
    assert.deepEqual(setConhecimentosDoGrupo(areas, 1, [21, 20, 21]), [
      grupo(TI.id, [10]),
      grupo(ADM.id, [21, 20]),
    ])
  })

  test('remover tira a área e os seus conhecimentos, sem tocar os outros', () => {
    const areas = [grupo(TI.id, [10]), grupo(ADM.id, [20]), grupo(null)]
    assert.deepEqual(removerGrupo(areas, 1), [grupo(TI.id, [10]), grupo(null)])
  })

  test('a lixeira some só no único grupo ainda vazio', () => {
    assert.equal(podeRemoverGrupo([grupo(null)], 0), false)
    assert.equal(podeRemoverGrupo([grupo(TI.id)], 0), true)
    assert.equal(podeRemoverGrupo([grupo(TI.id, [10]), grupo(null)], 1), true)
    assert.equal(podeRemoverGrupo([], 0), false)
  })

  test('grupo completo tem área e ao menos um conhecimento', () => {
    assert.equal(isGrupoCompleto(grupo(TI.id, [10])), true)
    assert.equal(isGrupoCompleto(grupo(TI.id)), false)
    assert.equal(isGrupoCompleto(grupo(null, [10])), false)
    assert.equal(isGrupoCompleto(undefined), false)
  })

  test('texto do botão: primeira área ou outra área', () => {
    assert.equal(getAdicionarAreaLabel(0), ADICIONAR_PRIMEIRA_AREA_LABEL)
    assert.equal(getAdicionarAreaLabel(0), 'Adicionar área de atuação')
    assert.equal(getAdicionarAreaLabel(2), ADICIONAR_OUTRA_AREA_LABEL)
    assert.equal(getAdicionarAreaLabel(2), 'Adicionar outra área de atuação')
  })

  test('o grupo sem área nunca vai para a API', () => {
    assert.deepEqual(
      getVagaHabilidadesParaApi({
        areas_atuacao: [grupo(TI.id, [10]), grupo(null, [])],
        comportamento_atitudes_ids: [1],
      }),
      {
        areas_atuacao: [{ id_area_atuacao: TI.id, conhecimento_ids: [10] }],
        comportamento_atitudes_ids: [1],
      }
    )
  })
})

describe('erros ao publicar', () => {
  test('sem nenhuma área', () => {
    assert.deepEqual(getErrosAreasHabilidades([]), {
      areas: ERRO_AREA_OBRIGATORIA,
    })
    assert.deepEqual(getErrosAreasHabilidades(undefined), {
      areas: ERRO_AREA_OBRIGATORIA,
    })
  })

  test('por grupo: sem área, sem conhecimento e área repetida', () => {
    const erros = getErrosAreasHabilidades([
      grupo(TI.id, [10]),
      grupo(ADM.id),
      grupo(null),
      grupo(TI.id, [11]),
    ])
    assert.deepEqual(erros, {
      grupos: [
        undefined,
        { conhecimentos: ERRO_CONHECIMENTO_OBRIGATORIO },
        { area: ERRO_AREA_DO_GRUPO },
        { area: ERRO_AREA_REPETIDA },
      ],
    })
    assert.deepEqual(
      getMensagensErroAreas([grupo(ADM.id), grupo(null), grupo(SAUDE.id)]),
      [ERRO_CONHECIMENTO_OBRIGATORIO, ERRO_AREA_DO_GRUPO]
    )
  })

  test('textos do Figma', () => {
    assert.equal(ERRO_AREA_DO_GRUPO, 'Selecione a área de atuação')
    assert.equal(
      ERRO_CONHECIMENTO_OBRIGATORIO,
      'Selecione ao menos um conhecimento desta área'
    )
    assert.equal(
      ERRO_COMPORTAMENTO_OBRIGATORIO,
      'Selecione ao menos um comportamento ou atitude'
    )
  })

  test('tudo certo não tem erro', () => {
    assert.deepEqual(
      getErrosAreasHabilidades([grupo(TI.id, [10]), grupo(ADM.id, [20])]),
      {}
    )
  })
})

const { publishValidationSchema, draftValidationSchema } = await import(
  '../../app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form.tsx'
)

const VAGA_PUBLICAVEL = {
  titulo: 'Vaga de teste',
  descricao: 'Descrição sintética',
  contratante: 'empresa-teste',
  regime_contratacao: 'clt',
  modelo_trabalho: 'presencial',
  bairro: 'Centro',
  data_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  id_orgao_parceiro: 'orgao-teste',
  requisitos: 'Requisitos sintéticos',
  responsabilidades: 'Responsabilidades sintéticas',
  areas_atuacao: [grupo(TI.id, [10]), grupo(ADM.id, [20])],
  comportamento_atitudes_ids: [1],
}

function mensagens(schema: typeof publishValidationSchema, dados: object) {
  const result = schema.safeParse(dados)
  return result.success
    ? []
    : result.error.issues.map(
        (issue: { path: PropertyKey[]; message: string }) => [
          issue.path.join('.'),
          issue.message,
        ]
      )
}

describe('validação de publicação do formulário', () => {
  test('várias áreas completas e um comportamento publicam', () => {
    assert.deepEqual(mensagens(publishValidationSchema, VAGA_PUBLICAVEL), [])
  })

  test('grupo sem área ou sem conhecimento impede publicar', () => {
    assert.deepEqual(
      mensagens(publishValidationSchema, {
        ...VAGA_PUBLICAVEL,
        areas_atuacao: [grupo(TI.id, [10]), grupo(ADM.id), grupo(null)],
      }),
      [
        ['areas_atuacao', ERRO_CONHECIMENTO_OBRIGATORIO],
        ['areas_atuacao', ERRO_AREA_DO_GRUPO],
      ]
    )
  })

  test('sem área ou sem comportamento impede publicar', () => {
    assert.deepEqual(
      mensagens(publishValidationSchema, {
        ...VAGA_PUBLICAVEL,
        areas_atuacao: [],
        comportamento_atitudes_ids: [],
      }),
      [
        ['areas_atuacao', ERRO_AREA_OBRIGATORIA],
        ['comportamento_atitudes_ids', ERRO_COMPORTAMENTO_OBRIGATORIO],
      ]
    )
    const {
      areas_atuacao: _areas,
      comportamento_atitudes_ids: _ids,
      ...semHabilidades
    } = VAGA_PUBLICAVEL
    assert.deepEqual(mensagens(publishValidationSchema, semHabilidades), [
      ['areas_atuacao', ERRO_AREA_OBRIGATORIA],
      ['comportamento_atitudes_ids', ERRO_COMPORTAMENTO_OBRIGATORIO],
    ])
  })

  test('rascunho não exige as habilidades e aceita o grupo sem área', () => {
    assert.deepEqual(
      mensagens(draftValidationSchema, {
        ...VAGA_PUBLICAVEL,
        areas_atuacao: [grupo(null)],
        comportamento_atitudes_ids: [],
      }),
      []
    )
  })
})
