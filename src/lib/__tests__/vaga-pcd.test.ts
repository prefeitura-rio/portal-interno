import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-408: no formulário da vaga, "Vaga PcD", "Acessibilidade PcD" e "Tipo de
// Deficiência (PcD)" viram a pergunta de 3 opções (opcao_pcd da DEV-407), com
// a lista de tipos e "Todos os tipos", o erro da exclusiva sem tipo e o
// bloqueio PcD ("pcd" em criterios_bloqueio), que só vale na exclusiva.
// DEV-422: textos da homologação do PREF-632/640, chips do campo de tipos e
// bloqueio ligado pela própria exclusiva (sem alerta nem "Ativar bloqueio").

const vagaPcd = await import('../vaga-pcd.ts')
const {
  OPCAO_PCD_DESCRICAO,
  OPCAO_PCD_LABEL,
  OPCAO_PCD_PADRAO,
  OPCOES_PCD,
  PCD_EXCLUSIVA_AVISO,
  PCD_PERGUNTA_LABEL,
  PCD_TITULO,
  TIPOS_PCD_APOIO,
  TIPOS_PCD_LABEL,
  TIPOS_PCD_PLACEHOLDER,
  TIPO_PCD_OBRIGATORIO_MENSAGEM,
  TODOS_OS_TIPOS_PCD_LABEL,
  aceitaTiposPcd,
  alternarTipoPcd,
  alternarTodosTiposPcd,
  faltaTipoPcd,
  getChipsTiposPcd,
  getOpcaoPcdDaVaga,
  getTiposPcdParaApi,
  isBloqueioPcdAtivo,
  isOpcaoPcd,
  isTodosTiposPcdSelecionados,
} = vagaPcd

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
  })

  test('textos da homologação (DEV-422)', () => {
    assert.equal(PCD_TITULO, 'Pessoas com deficiência')
    assert.equal(
      PCD_PERGUNTA_LABEL,
      'Esta vaga é para pessoas com deficiência?'
    )
    assert.deepEqual(
      OPCOES_PCD.map(opcao => OPCAO_PCD_DESCRICAO[opcao]),
      [
        'Sem destaque nem restrição para PcD.',
        'Destaca a vaga para PcD. Qualquer pessoa pode se candidatar.',
        'Só se candidata quem declarou ser PcD no cadastro.',
      ]
    )
    assert.equal(
      PCD_EXCLUSIVA_AVISO,
      'Quem não declarou deficiência no cadastro não consegue se candidatar.'
    )
    assert.equal(TIPOS_PCD_LABEL.preferencial, 'Tipos de deficiência')
    assert.equal(TIPOS_PCD_LABEL.exclusiva, 'Tipos de deficiência aceitos')
    assert.equal(
      TIPOS_PCD_APOIO.preferencial,
      'Os tipos aparecem como destaque na vaga.'
    )
    assert.match(TIPOS_PCD_APOIO.exclusiva, /"Todos os tipos"/)
    assert.equal(TIPOS_PCD_PLACEHOLDER, 'Selecione os tipos')
  })

  test('sem o alerta e o botão "Ativar bloqueio" da DEV-408', () => {
    assert.ok(!('BLOQUEIO_PCD_AVISO_TITULO' in vagaPcd))
    assert.ok(!('ATIVAR_BLOQUEIO_PCD_LABEL' in vagaPcd))
    assert.ok(!('mostraAvisoBloqueioPcd' in vagaPcd))
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

  test('chips: "Todos os tipos" com todos marcados, senão cada tipo', () => {
    const tipos = [
      { id: 'auditiva', label: 'Auditiva' },
      { id: 'fisica', label: 'Física' },
      { id: 'visual', label: 'Visual' },
    ]
    assert.deepEqual(getChipsTiposPcd([], tipos), [])
    assert.deepEqual(getChipsTiposPcd(['visual', 'auditiva'], tipos), [
      'Auditiva',
      'Visual',
    ])
    assert.deepEqual(
      getChipsTiposPcd(['visual', 'fisica', 'auditiva'], tipos),
      ['Todos os tipos']
    )
    assert.deepEqual(getChipsTiposPcd(['inexistente'], tipos), [])
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
  test('a exclusiva já bloqueia; preferencial e aberta não (DEV-422)', () => {
    assert.equal(isBloqueioPcdAtivo('exclusiva'), true)
    assert.equal(isBloqueioPcdAtivo('preferencial'), false)
    assert.equal(isBloqueioPcdAtivo('aberta'), false)
    assert.equal(isBloqueioPcdAtivo(undefined), false)
  })
})
