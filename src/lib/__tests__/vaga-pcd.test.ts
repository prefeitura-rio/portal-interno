import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-408: no formulário da vaga, "Vaga PcD", "Acessibilidade PcD" e "Tipo de
// Deficiência (PcD)" viram a pergunta de 3 opções (opcao_pcd da DEV-407), com
// a lista de tipos e "Todos os tipos", o erro da exclusiva sem tipo e o
// bloqueio PcD ("pcd" em criterios_bloqueio), que só vale na exclusiva.

const {
  ATIVAR_BLOQUEIO_PCD_LABEL,
  BLOQUEIO_PCD_AVISO_TITULO,
  OPCAO_PCD_LABEL,
  OPCAO_PCD_PADRAO,
  OPCOES_PCD,
  TIPO_PCD_OBRIGATORIO_MENSAGEM,
  TODOS_OS_TIPOS_PCD_LABEL,
  aceitaTiposPcd,
  alternarTipoPcd,
  alternarTodosTiposPcd,
  faltaTipoPcd,
  getBloqueioPcdDaVaga,
  getOpcaoPcdDaVaga,
  getTiposPcdParaApi,
  isBloqueioPcdAtivo,
  isOpcaoPcd,
  isTodosTiposPcdSelecionados,
  mostraAvisoBloqueioPcd,
} = await import('../vaga-pcd.ts')

describe('pergunta PcD de 3 opções', () => {
  test('três opções, na ordem, com os textos da história', () => {
    assert.deepEqual([...OPCOES_PCD], ['aberta', 'preferencial', 'exclusiva'])
    assert.deepEqual(
      OPCOES_PCD.map(opcao => OPCAO_PCD_LABEL[opcao]),
      ['Não, é aberta a todos', 'Preferencial para PcD', 'Exclusiva para PcD']
    )
  })

  test('vaga nova começa aberta a todos', () => {
    assert.equal(OPCAO_PCD_PADRAO, 'aberta')
  })

  test('só os valores da API são opções válidas', () => {
    assert.equal(isOpcaoPcd('exclusiva'), true)
    assert.equal(isOpcaoPcd('exclusivo_pcd'), false)
    assert.equal(isOpcaoPcd(''), false)
    assert.equal(isOpcaoPcd(undefined), false)
  })

  test('textos fixos do critério', () => {
    assert.equal(TODOS_OS_TIPOS_PCD_LABEL, 'Todos os tipos')
    assert.equal(
      TIPO_PCD_OBRIGATORIO_MENSAGEM,
      'Selecione ao menos um tipo de deficiência.'
    )
    assert.equal(BLOQUEIO_PCD_AVISO_TITULO, 'Bloqueio ainda não ativado')
    assert.equal(ATIVAR_BLOQUEIO_PCD_LABEL, 'Ativar bloqueio')
  })
})

describe('opção PcD lida da vaga', () => {
  test('usa opcao_pcd quando a API devolve', () => {
    assert.equal(
      getOpcaoPcdDaVaga({
        opcao_pcd: 'preferencial',
        acessibilidade_pcd: 'exclusivo_pcd',
      }),
      'preferencial'
    )
    assert.equal(getOpcaoPcdDaVaga({ opcao_pcd: 'aberta' }), 'aberta')
  })

  test('sem opcao_pcd aplica o de/para do campo antigo', () => {
    assert.equal(getOpcaoPcdDaVaga({}), 'aberta')
    assert.equal(getOpcaoPcdDaVaga({ acessibilidade_pcd: null }), 'aberta')
    assert.equal(
      getOpcaoPcdDaVaga({ acessibilidade_pcd: 'exclusivo_pcd' }),
      'exclusiva'
    )
    assert.equal(
      getOpcaoPcdDaVaga({ acessibilidade_pcd: 'preferencial_pcd' }),
      'preferencial'
    )
    assert.equal(
      getOpcaoPcdDaVaga({ acessibilidade_pcd: 'para_pcd' }),
      'preferencial'
    )
  })

  test('opcao_pcd desconhecida cai no de/para', () => {
    assert.equal(
      getOpcaoPcdDaVaga({
        opcao_pcd: 'outra',
        acessibilidade_pcd: 'exclusivo_pcd',
      }),
      'exclusiva'
    )
  })

  test('bloqueio PcD gravado é a chave "pcd" de criterios_bloqueio', () => {
    const vaga = (criterios_bloqueio?: unknown) => ({
      titulo: 'Vaga sintética',
      criterios_bloqueio,
    })
    assert.equal(getBloqueioPcdDaVaga(vaga(['escolaridade', 'pcd'])), true)
    assert.equal(getBloqueioPcdDaVaga(vaga(['escolaridade', 'idioma'])), false)
    assert.equal(getBloqueioPcdDaVaga(vaga([])), false)
    assert.equal(getBloqueioPcdDaVaga(vaga()), false)
    assert.equal(getBloqueioPcdDaVaga(vaga('pcd')), false)
    assert.equal(getBloqueioPcdDaVaga({ titulo: 'Sem o campo' }), false)
  })
})

describe('tipos de deficiência', () => {
  const disponiveis = ['auditiva', 'fisica', 'visual']

  test('lista aparece na preferencial e na exclusiva, não na aberta', () => {
    assert.equal(aceitaTiposPcd('aberta'), false)
    assert.equal(aceitaTiposPcd(undefined), false)
    assert.equal(aceitaTiposPcd('preferencial'), true)
    assert.equal(aceitaTiposPcd('exclusiva'), true)
  })

  test('"Todos os tipos" marcado só com todos selecionados', () => {
    assert.equal(isTodosTiposPcdSelecionados(disponiveis, disponiveis), true)
    assert.equal(
      isTodosTiposPcdSelecionados(
        ['visual', 'fisica', 'auditiva'],
        disponiveis
      ),
      true
    )
    assert.equal(
      isTodosTiposPcdSelecionados(['auditiva', 'fisica'], disponiveis),
      false
    )
    assert.equal(isTodosTiposPcdSelecionados([], disponiveis), false)
    assert.equal(isTodosTiposPcdSelecionados([], []), false)
  })

  test('marcar "Todos os tipos" seleciona todos; desmarcar limpa', () => {
    assert.deepEqual(alternarTodosTiposPcd(true, disponiveis), disponiveis)
    assert.deepEqual(alternarTodosTiposPcd(false, disponiveis), [])
  })

  test('marcar e desmarcar um tipo', () => {
    assert.deepEqual(alternarTipoPcd(['auditiva'], 'visual', true), [
      'auditiva',
      'visual',
    ])
    assert.deepEqual(alternarTipoPcd(['auditiva'], 'auditiva', true), [
      'auditiva',
    ])
    assert.deepEqual(
      alternarTipoPcd(['auditiva', 'visual'], 'auditiva', false),
      ['visual']
    )
  })

  test('exclusiva sem nenhum tipo é erro; com tipo ou outra opção, não', () => {
    assert.equal(faltaTipoPcd('exclusiva', []), true)
    assert.equal(faltaTipoPcd('exclusiva', undefined), true)
    assert.equal(faltaTipoPcd('exclusiva', ['visual']), false)
    assert.equal(faltaTipoPcd('preferencial', []), false)
    assert.equal(faltaTipoPcd('aberta', []), false)
  })

  test('corpo da API: sempre array; aberta vai sem tipos', () => {
    assert.deepEqual(getTiposPcdParaApi('aberta', ['visual']), [])
    assert.deepEqual(getTiposPcdParaApi(undefined, ['visual']), [])
    assert.deepEqual(getTiposPcdParaApi('preferencial', []), [])
    assert.deepEqual(getTiposPcdParaApi('exclusiva', ['visual', 'fisica']), [
      { id: 'visual' },
      { id: 'fisica' },
    ])
    assert.deepEqual(
      getTiposPcdParaApi('preferencial', ['visual', 'visual', ' ']),
      [{ id: 'visual' }]
    )
  })
})

describe('bloqueio PcD', () => {
  test('só a exclusiva com o bloqueio ligado bloqueia', () => {
    assert.equal(isBloqueioPcdAtivo('exclusiva', true), true)
    assert.equal(isBloqueioPcdAtivo('exclusiva', false), false)
    assert.equal(isBloqueioPcdAtivo('preferencial', true), false)
    assert.equal(isBloqueioPcdAtivo('aberta', true), false)
  })

  test('alerta "Bloqueio ainda não ativado" na exclusiva desligada', () => {
    assert.equal(mostraAvisoBloqueioPcd('exclusiva', false), true)
    assert.equal(mostraAvisoBloqueioPcd('exclusiva', undefined), true)
    assert.equal(mostraAvisoBloqueioPcd('exclusiva', true), false)
    assert.equal(mostraAvisoBloqueioPcd('preferencial', false), false)
    assert.equal(mostraAvisoBloqueioPcd('aberta', false), false)
  })
})
