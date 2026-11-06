import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// DEV-425 (história PREF-633): critério "Experiência em carteira" da vaga.
// O app-go-api (DEV-424) grava o tempo em `experiencia_carteira`
// (`qualquer_tempo` | `minimo_6_meses`; "" remove) e o bloqueio na chave
// `experiencia_carteira` de `criterios_bloqueio`. Vagas sem a chave ficam com
// o critério desligado.

const {
  CRITERIO_BLOQUEIO_EXPERIENCIA_CARTEIRA,
  EXPERIENCIA_CARTEIRA_DESCRICAO,
  EXPERIENCIA_CARTEIRA_LABEL,
  EXPERIENCIA_CARTEIRA_PADRAO,
  EXPERIENCIA_CARTEIRA_TITULO,
  OPCOES_EXPERIENCIA_CARTEIRA,
  getExperienciaCarteiraDaVaga,
  getExperienciaCarteiraParaApi,
  isExperienciaCarteira,
} = await import('../vaga-experiencia-carteira.ts')

describe('opções do critério', () => {
  test('valores do app-go-api, na ordem do formulário', () => {
    assert.deepEqual(
      [...OPCOES_EXPERIENCIA_CARTEIRA],
      ['qualquer_tempo', 'minimo_6_meses']
    )
    assert.equal(CRITERIO_BLOQUEIO_EXPERIENCIA_CARTEIRA, 'experiencia_carteira')
  })

  test('título e rótulos das duas opções', () => {
    assert.equal(EXPERIENCIA_CARTEIRA_TITULO, 'Experiência em carteira')
    assert.deepEqual(EXPERIENCIA_CARTEIRA_LABEL, {
      qualquer_tempo: 'Qualquer tempo',
      minimo_6_meses: 'Mínimo de 6 meses',
    })
    for (const opcao of OPCOES_EXPERIENCIA_CARTEIRA) {
      assert.ok(EXPERIENCIA_CARTEIRA_DESCRICAO[opcao].length > 0)
    }
  })

  test('ligar o critério marca "Qualquer tempo"', () => {
    assert.equal(EXPERIENCIA_CARTEIRA_PADRAO, 'qualquer_tempo')
  })

  test('isExperienciaCarteira aceita só as duas opções', () => {
    assert.ok(isExperienciaCarteira('qualquer_tempo'))
    assert.ok(isExperienciaCarteira('minimo_6_meses'))
    for (const invalido of ['', 'minimo_12_meses', null, undefined, 6, {}]) {
      assert.ok(!isExperienciaCarteira(invalido), String(invalido))
    }
  })
})

describe('critério lido da vaga', () => {
  test('vaga existente sem o bloqueio fica desligada', () => {
    assert.equal(getExperienciaCarteiraDaVaga({}), null)
    assert.equal(
      getExperienciaCarteiraDaVaga({ criterios_bloqueio: ['escolaridade'] }),
      null
    )
    assert.equal(
      getExperienciaCarteiraDaVaga({
        criterios_bloqueio: [],
        experiencia_carteira: null,
      }),
      null
    )
    assert.equal(
      getExperienciaCarteiraDaVaga({ criterios_bloqueio: null }),
      null
    )
  })

  test('tempo gravado sem o bloqueio ligado continua desligado', () => {
    assert.equal(
      getExperienciaCarteiraDaVaga({
        criterios_bloqueio: ['pcd'],
        experiencia_carteira: 'minimo_6_meses',
      }),
      null
    )
  })

  test('bloqueio ligado devolve a opção gravada', () => {
    for (const opcao of OPCOES_EXPERIENCIA_CARTEIRA) {
      assert.equal(
        getExperienciaCarteiraDaVaga({
          criterios_bloqueio: ['escolaridade', 'experiencia_carteira'],
          experiencia_carteira: opcao,
        }),
        opcao
      )
    }
  })

  test('bloqueio ligado sem opção válida mostra a padrão', () => {
    for (const experiencia_carteira of [undefined, null, '', 'outra']) {
      assert.equal(
        getExperienciaCarteiraDaVaga({
          criterios_bloqueio: ['experiencia_carteira'],
          experiencia_carteira,
        }),
        'qualquer_tempo'
      )
    }
  })
})

describe('experiencia_carteira enviado à API', () => {
  test('ligado envia a opção', () => {
    assert.equal(
      getExperienciaCarteiraParaApi('qualquer_tempo'),
      'qualquer_tempo'
    )
    assert.equal(
      getExperienciaCarteiraParaApi('minimo_6_meses'),
      'minimo_6_meses'
    )
  })

  test('desligado envia "" (no PUT, ausente manteria o valor gravado)', () => {
    assert.equal(getExperienciaCarteiraParaApi(null), '')
    assert.equal(getExperienciaCarteiraParaApi(undefined), '')
  })
})
