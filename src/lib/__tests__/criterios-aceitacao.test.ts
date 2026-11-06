import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-394: no bloco "Critérios de aceitação da vaga", cada critério mostra a
// tag "Bloqueio ativo" (switch ligado) ou "Bloqueio desligado" (switch
// desligado), e o bloco segue a ordem PcD, Idade, Experiência em carteira,
// Escolaridade mínima, Idioma.

const {
  BLOQUEIO_TAG_LABEL,
  CRITERIOS_ACEITACAO_ORDEM,
  getBloqueioEstado,
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
