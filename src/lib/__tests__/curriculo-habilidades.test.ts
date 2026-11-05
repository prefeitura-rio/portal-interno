import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-346: a gaveta "Detalhes da Candidatura" mostra a seção "Habilidades e
// competências" do curriculo_snapshot (área de atuação, conhecimentos e
// comportamentos e atitudes), tratando snapshot antigo como "sem dados".

const {
  HABILIDADES_CHIPS_LIMIT,
  extractHabilidadesCompetencias,
  getToggleChipsLabel,
  getVisibleChips,
} = await import('../curriculo-habilidades.ts')

function catalogo(prefixo: string, total: number) {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    nome: `${prefixo} ${String(i + 1).padStart(2, '0')}`,
  }))
}

describe('extractHabilidadesCompetencias', () => {
  test('snapshot ausente ou nulo é "sem dados"', () => {
    assert.equal(extractHabilidadesCompetencias(undefined), null)
    assert.equal(extractHabilidadesCompetencias(null), null)
  })

  test('currículo antigo, sem os três campos, é "sem dados"', () => {
    assert.equal(extractHabilidadesCompetencias({}), null)
  })

  test('os três campos nulos ou vazios são "sem dados"', () => {
    assert.equal(
      extractHabilidadesCompetencias({
        area_atuacao: null,
        conhecimentos: null,
        comportamentos_atitudes: null,
      }),
      null
    )
    assert.equal(
      extractHabilidadesCompetencias({
        area_atuacao: null,
        conhecimentos: [],
        comportamentos_atitudes: [],
      }),
      null
    )
  })

  test('itens sem nome não contam como dado', () => {
    assert.equal(
      extractHabilidadesCompetencias({
        area_atuacao: { id: 1, nome: '   ' },
        conhecimentos: [null, { id: 2 }, { id: 3, nome: '' }],
        comportamentos_atitudes: [{ id: 4, nome: null }],
      }),
      null
    )
  })

  test('campo com tipo inesperado não quebra a leitura', () => {
    const resultado = extractHabilidadesCompetencias({
      area_atuacao: 'Tecnologia' as unknown as { nome: string },
      conhecimentos: { id: 1, nome: 'Excel' } as unknown as [],
      comportamentos_atitudes: [{ id: 2, nome: 'Proatividade' }],
    })
    assert.deepEqual(resultado, {
      areaAtuacao: null,
      conhecimentos: [],
      comportamentos: [{ key: 'comportamento-2-0', nome: 'Proatividade' }],
    })
  })

  test('só a área de atuação basta para exibir a seção', () => {
    assert.deepEqual(
      extractHabilidadesCompetencias({
        area_atuacao: { id: 7, nome: ' Tecnologia da informação ' },
      }),
      {
        areaAtuacao: 'Tecnologia da informação',
        conhecimentos: [],
        comportamentos: [],
      }
    )
  })

  test('só um dos grupos basta, e o outro fica vazio (oculto)', () => {
    const resultado = extractHabilidadesCompetencias({
      area_atuacao: null,
      conhecimentos: [{ id: 3, nome: 'Excel' }],
      comportamentos_atitudes: [],
    })
    assert.ok(resultado)
    assert.equal(resultado.areaAtuacao, null)
    assert.deepEqual(
      resultado.conhecimentos.map(c => c.nome),
      ['Excel']
    )
    assert.equal(resultado.comportamentos.length, 0)
  })

  test('mantém a ordem recebida da API e chaves únicas', () => {
    const resultado = extractHabilidadesCompetencias({
      area_atuacao: { id: 1, nome: 'Administração' },
      conhecimentos: [
        { id: 30, nome: 'Atendimento' },
        { id: 10, nome: 'Excel' },
        { id: 20, nome: 'Word' },
      ],
      comportamentos_atitudes: [
        { id: 5, nome: 'Comunicação' },
        { id: 5, nome: 'Comunicação' },
      ],
    })
    assert.ok(resultado)
    assert.deepEqual(
      resultado.conhecimentos.map(c => c.nome),
      ['Atendimento', 'Excel', 'Word']
    )
    const chaves = resultado.comportamentos.map(c => c.key)
    assert.equal(new Set(chaves).size, chaves.length)
  })
})

describe('getVisibleChips', () => {
  test('o limite recolhido é 9 chips por grupo', () => {
    assert.equal(HABILIDADES_CHIPS_LIMIT, 9)
  })

  test('até 9 chips: mostra todos, sem botão', () => {
    const chips = catalogo('Item', 9).map(c => ({ key: c.nome, nome: c.nome }))
    const { visible, hiddenCount } = getVisibleChips(chips, false)
    assert.equal(visible.length, 9)
    assert.equal(hiddenCount, 0)
    assert.equal(getToggleChipsLabel(hiddenCount, false), null)
  })

  test('acima de 9: recolhido mostra os 9 primeiros e "Ver todos (+N)"', () => {
    const chips = catalogo('Item', 12).map(c => ({ key: c.nome, nome: c.nome }))
    const { visible, hiddenCount } = getVisibleChips(chips, false)
    assert.deepEqual(
      visible.map(c => c.nome),
      chips.slice(0, 9).map(c => c.nome)
    )
    assert.equal(hiddenCount, 3)
    assert.equal(getToggleChipsLabel(hiddenCount, false), 'Ver todos (+3)')
  })

  test('acima de 9 e expandido: mostra todos e "Ver menos"', () => {
    const chips = catalogo('Item', 12).map(c => ({ key: c.nome, nome: c.nome }))
    const { visible, hiddenCount } = getVisibleChips(chips, true)
    assert.equal(visible.length, 12)
    assert.equal(hiddenCount, 3)
    assert.equal(getToggleChipsLabel(hiddenCount, true), 'Ver menos')
  })
})
