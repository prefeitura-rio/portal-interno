import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// Homologação PREF-536: o filtro de idade dos candidatos deixa de ter idade
// mínima e máxima livres (etarismo) e passa a ter as opções fixas do critério
// de idade da vaga, em `faixa_etaria` (maiores_de_18 | jovem_aprendiz). O BFF
// repassa para o app-go-api só os parâmetros do filtro.

const { parametrosDoFiltroCandidatos } = await import(
  '../filtro-candidatos-params.ts'
)
const { OPCOES_IDADE } = await import('../vaga-jovem-aprendiz.ts')

describe('parametrosDoFiltroCandidatos', () => {
  test('repassa a faixa etária como texto', () => {
    for (const faixa of ['maiores_de_18', 'jovem_aprendiz']) {
      const params = parametrosDoFiltroCandidatos(
        new URLSearchParams({ faixa_etaria: faixa })
      )
      assert.deepEqual(params, { faixa_etaria: faixa })
    }
  })

  test('não repassa mais idade mínima e máxima livres', () => {
    const params = parametrosDoFiltroCandidatos(
      new URLSearchParams({ idade_min: '30', idade_max: '40', pcd: 'sim' })
    )
    assert.deepEqual(params, { pcd: 'sim' })
  })

  test('ignora parâmetros vazios e os que não são do filtro', () => {
    const params = parametrosDoFiltroCandidatos(
      new URLSearchParams({ faixa_etaria: '  ', page: '2', search: 'ana' })
    )
    assert.deepEqual(params, {})
  })

  test('as opções do filtro são as mesmas do critério de idade da vaga', () => {
    assert.deepEqual([...OPCOES_IDADE], ['maiores_de_18', 'jovem_aprendiz'])
  })
})
