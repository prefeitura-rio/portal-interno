import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-394: no bloco "Critérios de aceitação da vaga", cada critério mostra a
// tag "Bloqueio ativo" (switch ligado) ou "Bloqueio desligado" (switch
// desligado), e o bloco segue a ordem PcD, Idade, Experiência em carteira,
// Escolaridade mínima, Idioma.

const {
  BLOQUEIO_TAG_LABEL,
  CRITERIOS_ACEITACAO_ORDEM,
  CRITERIOS_BLOQUEIO_API,
  getBloqueioEstado,
  getCriteriosBloqueio,
  getBloqueioTagLabel,
  ordenarCriteriosAceitacao,
} = await import('../criterios-aceitacao.ts')

describe('tag de bloqueio', () => {
  test('switch ligado mostra "Bloqueio ativo"', () => {
    assert.equal(getBloqueioEstado(true), 'ativo')
    assert.equal(getBloqueioTagLabel(true), 'Bloqueio ativo')
  })

  test('switch desligado mostra "Bloqueio desligado"', () => {
    assert.equal(getBloqueioEstado(false), 'desligado')
    assert.equal(getBloqueioTagLabel(false), 'Bloqueio desligado')
  })

  test('só existem os dois rótulos', () => {
    assert.deepEqual(BLOQUEIO_TAG_LABEL, {
      ativo: 'Bloqueio ativo',
      desligado: 'Bloqueio desligado',
    })
  })
})

describe('ordem do bloco de critérios', () => {
  test('ordem final: PcD, Idade, Experiência, Escolaridade, Idioma', () => {
    assert.deepEqual(
      [...CRITERIOS_ACEITACAO_ORDEM],
      ['pcd', 'idade', 'experiencia', 'escolaridade', 'idioma']
    )
  })

  test('ordena os critérios presentes hoje (idade, escolaridade, idioma)', () => {
    const ordenados = ordenarCriteriosAceitacao([
      { id: 'idioma' as const },
      { id: 'idade' as const },
      { id: 'escolaridade' as const },
    ])
    assert.deepEqual(
      ordenados.map(c => c.id),
      ['idade', 'escolaridade', 'idioma']
    )
  })

  test('critérios futuros entram na posição reservada', () => {
    const ordenados = ordenarCriteriosAceitacao([
      { id: 'idioma' as const },
      { id: 'escolaridade' as const },
      { id: 'experiencia' as const },
      { id: 'idade' as const },
      { id: 'pcd' as const },
    ])
    assert.deepEqual(
      ordenados.map(c => c.id),
      ['pcd', 'idade', 'experiencia', 'escolaridade', 'idioma']
    )
  })

  test('não altera o array recebido', () => {
    const entrada = [{ id: 'idioma' as const }, { id: 'idade' as const }]
    ordenarCriteriosAceitacao(entrada)
    assert.deepEqual(
      entrada.map(c => c.id),
      ['idioma', 'idade']
    )
  })
})

// DEV-400: o estado dos switches vai para a API como `criterios_bloqueio`
// (chaves do app-go-api, DEV-392) ao criar, duplicar e editar a vaga.
describe('criterios_bloqueio enviado à API', () => {
  const idioma = { id_idioma: 'idioma-1', id_nivel_minimo: 'nivel-1' }

  test('só as chaves que o app-go-api aceita, na ordem dele', () => {
    // DEV-408: `pcd` é aceito desde a DEV-407 e vem depois de idioma.
    // DEV-425: `experiencia_carteira` é aceito desde a DEV-424, no fim.
    assert.deepEqual(
      [...CRITERIOS_BLOQUEIO_API],
      ['escolaridade', 'idioma', 'pcd', 'experiencia_carteira']
    )
  })

  test('Experiência em carteira ligada entra como "experiencia_carteira"', () => {
    for (const opcao of ['qualquer_tempo', 'minimo_6_meses'] as const) {
      assert.deepEqual(getCriteriosBloqueio({ experienciaCarteira: opcao }), [
        'experiencia_carteira',
      ])
    }
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: 'superior-completo',
        idiomasRequisito: [idioma],
        bloqueioPcd: true,
        experienciaCarteira: 'minimo_6_meses',
      }),
      ['escolaridade', 'idioma', 'pcd', 'experiencia_carteira']
    )
  })

  test('Experiência em carteira desligada ou ausente não envia a chave', () => {
    assert.deepEqual(getCriteriosBloqueio({ experienciaCarteira: null }), [])
    assert.deepEqual(getCriteriosBloqueio({ bloqueioPcd: true }), ['pcd'])
  })

  test('bloqueio PcD ligado entra como "pcd", na ordem da API', () => {
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: 'superior-completo',
        idiomasRequisito: [idioma],
        bloqueioPcd: true,
      }),
      ['escolaridade', 'idioma', 'pcd']
    )
    assert.deepEqual(getCriteriosBloqueio({ bloqueioPcd: true }), ['pcd'])
  })

  test('bloqueio PcD desligado ou ausente não envia "pcd"', () => {
    assert.deepEqual(getCriteriosBloqueio({ bloqueioPcd: false }), [])
    assert.deepEqual(
      getCriteriosBloqueio({ idEscolaridadeMinima: 'medio-completo' }),
      ['escolaridade']
    )
  })

  test('escolaridade e idioma ligados', () => {
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: 'superior-completo',
        idiomasRequisito: [idioma],
      }),
      ['escolaridade', 'idioma']
    )
  })

  test('só escolaridade ligada', () => {
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: 'superior-completo',
        idiomasRequisito: [],
      }),
      ['escolaridade']
    )
  })

  test('só idioma ligado', () => {
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: undefined,
        idiomasRequisito: [idioma, { ...idioma, id_idioma: 'idioma-2' }],
      }),
      ['idioma']
    )
  })

  test('tudo desligado devolve [] (no PUT, ausente manteria o estado gravado)', () => {
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: null,
        idiomasRequisito: [],
      }),
      []
    )
    assert.deepEqual(getCriteriosBloqueio({}), [])
    assert.deepEqual(
      getCriteriosBloqueio({
        idEscolaridadeMinima: '  ',
        idiomasRequisito: null,
      }),
      []
    )
  })
})
