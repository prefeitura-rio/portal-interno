import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-347: a ficha do Banco de Currículos mostra "Habilidades e competências"
// (área de atuação, conhecimentos, comportamentos e atitudes) do currículo do
// cidadão, na ordem da API e sem quebrar com currículos antigos.

const { habilidadesDoCurriculo, temHabilidades } = await import(
  '../curriculo-habilidades.ts'
)

describe('habilidadesDoCurriculo', () => {
  test('currículo completo: área, conhecimentos e comportamentos na ordem da API', () => {
    const habilidades = habilidadesDoCurriculo({
      area_atuacao: { id: 3, nome: 'Tecnologia da Informação' },
      conhecimentos: [
        { id: 10, nome: 'Excel' },
        { id: 7, nome: 'Git' },
        { id: 1, nome: 'Python' },
      ],
      comportamentos_atitudes: [
        { id: 5, nome: 'Comunicação' },
        { id: 2, nome: 'Trabalho em equipe' },
      ],
    })

    assert.deepEqual(habilidades, {
      areaAtuacao: 'Tecnologia da Informação',
      conhecimentos: [
        { id: 10, nome: 'Excel' },
        { id: 7, nome: 'Git' },
        { id: 1, nome: 'Python' },
      ],
      comportamentosAtitudes: [
        { id: 5, nome: 'Comunicação' },
        { id: 2, nome: 'Trabalho em equipe' },
      ],
    })
    assert.equal(temHabilidades(habilidades), true)
  })

  test('não limita a quantidade de itens', () => {
    const conhecimentos = Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      nome: `Conhecimento ${String(i + 1).padStart(2, '0')}`,
    }))

    const habilidades = habilidadesDoCurriculo({ conhecimentos })

    assert.equal(habilidades.conhecimentos.length, 40)
    assert.deepEqual(habilidades.conhecimentos, conhecimentos)
  })

  test('só comportamentos: área nula e nenhum conhecimento', () => {
    const habilidades = habilidadesDoCurriculo({
      area_atuacao: null,
      conhecimentos: [],
      comportamentos_atitudes: [{ id: 4, nome: 'Proatividade' }],
    })

    assert.equal(habilidades.areaAtuacao, null)
    assert.deepEqual(habilidades.conhecimentos, [])
    assert.deepEqual(habilidades.comportamentosAtitudes, [
      { id: 4, nome: 'Proatividade' },
    ])
    assert.equal(temHabilidades(habilidades), true)
  })

  test('só área de atuação conta como preenchida', () => {
    const habilidades = habilidadesDoCurriculo({
      area_atuacao: { id: 1, nome: 'Saúde' },
    })

    assert.equal(habilidades.areaAtuacao, 'Saúde')
    assert.equal(temHabilidades(habilidades), true)
  })

  test('sem dados: seção vazia', () => {
    const habilidades = habilidadesDoCurriculo({
      area_atuacao: null,
      conhecimentos: [],
      comportamentos_atitudes: [],
    })

    assert.deepEqual(habilidades, {
      areaAtuacao: null,
      conhecimentos: [],
      comportamentosAtitudes: [],
    })
    assert.equal(temHabilidades(habilidades), false)
  })

  test('currículo antigo, sem os campos novos, é tratado como vazio', () => {
    const habilidades = habilidadesDoCurriculo({
      resumo_profissional: 'Resumo sintético',
      experiencias: [],
    })

    assert.equal(temHabilidades(habilidades), false)
  })

  test('sem currículo nenhum: vazio, sem erro', () => {
    assert.equal(temHabilidades(habilidadesDoCurriculo(undefined)), false)
    assert.equal(temHabilidades(habilidadesDoCurriculo(null)), false)
  })

  test('ignora itens sem nome e valores fora do formato esperado', () => {
    // Resposta crua da API fora do contrato: não pode quebrar a ficha.
    const habilidades = habilidadesDoCurriculo(
      JSON.parse(
        JSON.stringify({
          area_atuacao: { id: 9, nome: '   ' },
          conhecimentos: [
            { id: 1, nome: ' Excel ' },
            { id: 2 },
            null,
            { id: 3, nome: '' },
            { id: 4, nome: 42 },
          ],
          comportamentos_atitudes: 'não é lista',
        })
      )
    )

    assert.deepEqual(habilidades, {
      areaAtuacao: null,
      conhecimentos: [{ id: 1, nome: 'Excel' }],
      comportamentosAtitudes: [],
    })
  })
})
