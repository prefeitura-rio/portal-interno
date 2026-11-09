import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-429 (história PREF-634): seção Idade da vaga com Maiores de 18 e Jovem
// Aprendiz. O app-go-api (DEV-428) grava a opção Jovem Aprendiz em
// `jovem_aprendiz` (booleano, faixa fixa de 14 a 24 anos) e o bloqueio na
// chave `jovem_aprendiz` de `criterios_bloqueio`. Maiores de 18 continua
// sendo `idade_minima` = 18. Vagas sem a chave ficam com Jovem Aprendiz
// desligado.

const {
  CRITERIO_BLOQUEIO_JOVEM_APRENDIZ,
  IDADE_TITULO,
  JOVEM_APRENDIZ_DESCRICAO,
  JOVEM_APRENDIZ_IDADE_MAXIMA,
  JOVEM_APRENDIZ_IDADE_MINIMA,
  JOVEM_APRENDIZ_LABEL,
  MAIORES_DE_18_DESCRICAO,
  MAIORES_DE_18_IDADE_MINIMA,
  MAIORES_DE_18_LABEL,
  getJovemAprendizDaVaga,
  getJovemAprendizParaApi,
} = await import('../vaga-jovem-aprendiz.ts')

describe('opções da seção Idade', () => {
  test('título e rótulos das duas opções', () => {
    assert.equal(IDADE_TITULO, 'Idade')
    assert.equal(MAIORES_DE_18_LABEL, 'Maiores de 18')
    assert.equal(JOVEM_APRENDIZ_LABEL, 'Jovem Aprendiz')
  })

  test('faixas fixas do app-go-api, sem número livre', () => {
    assert.equal(MAIORES_DE_18_IDADE_MINIMA, 18)
    assert.equal(JOVEM_APRENDIZ_IDADE_MINIMA, 14)
    assert.equal(JOVEM_APRENDIZ_IDADE_MAXIMA, 24)
    assert.equal(MAIORES_DE_18_DESCRICAO, 'Candidatos com 18 anos ou mais.')
    assert.equal(JOVEM_APRENDIZ_DESCRICAO, 'Candidatos de 14 a 24 anos.')
  })

  test('chave do bloqueio é o slug do app-go-api', () => {
    assert.equal(CRITERIO_BLOQUEIO_JOVEM_APRENDIZ, 'jovem_aprendiz')
  })
})

describe('Jovem Aprendiz de uma vaga lida da API', () => {
  test('vaga existente sem a chave nasce desligada', () => {
    assert.equal(getJovemAprendizDaVaga({}), false)
    assert.equal(getJovemAprendizDaVaga({ criterios_bloqueio: null }), false)
    assert.equal(getJovemAprendizDaVaga({ criterios_bloqueio: [] }), false)
    assert.equal(
      getJovemAprendizDaVaga({
        idade_minima: 18,
        jovem_aprendiz: false,
        criterios_bloqueio: ['escolaridade', 'experiencia_carteira'],
      }),
      false
    )
  })

  test('ligada com a chave jovem_aprendiz em criterios_bloqueio', () => {
    assert.equal(
      getJovemAprendizDaVaga({
        jovem_aprendiz: true,
        criterios_bloqueio: ['pcd', 'jovem_aprendiz'],
      }),
      true
    )
  })

  test('criterios_bloqueio que não é lista é ignorado', () => {
    assert.equal(
      getJovemAprendizDaVaga({ criterios_bloqueio: 'jovem_aprendiz' }),
      false
    )
  })
})

describe('jovem_aprendiz enviado à API', () => {
  test('sempre booleano: no PUT ausente manteria o valor gravado', () => {
    assert.equal(getJovemAprendizParaApi(true), true)
    assert.equal(getJovemAprendizParaApi(false), false)
    assert.equal(getJovemAprendizParaApi(null), false)
    assert.equal(getJovemAprendizParaApi(undefined), false)
  })
})
