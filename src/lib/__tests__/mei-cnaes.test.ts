import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MEI_CNAES, findMeiCnae, searchMeiCnaes } from '../mei-cnaes.ts'

// DEV-69: o campo Subclasses CNAE da oportunidade MEI só oferece as
// subclasses do Anexo XI da Resolução CGSN nº 140/2018 e busca por código
// (inteiro ou parcial) ou por nome da atividade ou da ocupação.

function subclasses(query: string): string[] {
  return searchMeiCnaes(query).map(result => result.cnae.subclasse)
}

describe('lista do Anexo XI', () => {
  test('tem as 351 subclasses das Tabelas A e B, sem repetição', () => {
    assert.equal(MEI_CNAES.length, 351)
    const codes = MEI_CNAES.map(cnae => cnae.subclasse)
    assert.equal(new Set(codes).size, codes.length)
    assert.equal(
      MEI_CNAES.reduce((total, cnae) => total + cnae.ocupacoes.length, 0),
      471
    )
  })

  test('toda subclasse tem formato 0000-0/00, descrição e ocupação', () => {
    for (const cnae of MEI_CNAES) {
      assert.match(cnae.subclasse, /^\d{4}-\d\/\d{2}$/)
      assert.ok(cnae.denominacao.trim().length > 0, cnae.subclasse)
      assert.ok(cnae.ocupacoes.length > 0, cnae.subclasse)
    }
  })

  test('inclui a Tabela B (caminhoneiro)', () => {
    for (const code of ['4930-2/02', '4930-2/03', '4930-2/04']) {
      assert.ok(findMeiCnae(code), code)
    }
  })
})

describe('busca por código', () => {
  test('código completo da issue (4724-5/00)', () => {
    assert.deepEqual(subclasses('4724-5/00'), ['4724-5/00'])
    const [result] = searchMeiCnaes('4724-5/00')
    assert.equal(
      result.cnae.denominacao,
      'COMÉRCIO VAREJISTA DE HORTIFRUTIGRANJEIROS'
    )
    assert.ok(result.cnae.ocupacoes.includes('VERDUREIRO INDEPENDENTE'))
  })

  test('código sem máscara e com espaços', () => {
    assert.deepEqual(subclasses('4724500'), ['4724-5/00'])
    assert.deepEqual(subclasses(' 4724 5 00 '), ['4724-5/00'])
  })

  test('código parcial lista todas as subclasses do prefixo', () => {
    const found = subclasses('4724')
    assert.deepEqual(found, ['4724-5/00'])
    const prefix47 = subclasses('47')
    assert.ok(prefix47.length > 1)
    assert.ok(prefix47.every(code => code.startsWith('47')))
    assert.ok(prefix47.includes('4724-5/00'))
  })

  test('CNAE fora do Anexo XI não aparece', () => {
    // 6201-5/01: desenvolvimento de software sob encomenda (não é MEI)
    assert.deepEqual(subclasses('6201-5/01'), [])
    assert.deepEqual(subclasses('6201'), [])
    assert.equal(findMeiCnae('6201-5/01'), undefined)
  })

  test('máscara sem dígitos não traz resultado', () => {
    assert.deepEqual(subclasses('-/.'), [])
  })
})

describe('busca por nome', () => {
  test('pela descrição, sem acento nem maiúsculas', () => {
    assert.ok(subclasses('hortifruti').includes('4724-5/00'))
    assert.ok(
      subclasses('Comercio Varejista de Hortifrutigranjeiros').includes(
        '4724-5/00'
      )
    )
  })

  test('pela ocupação, com as ocupações encontradas', () => {
    const results = searchMeiCnaes('verdureiro')
    assert.deepEqual(
      results.map(result => result.cnae.subclasse),
      ['4724-5/00']
    )
    assert.deepEqual(results[0].ocupacoesEncontradas, [
      'VERDUREIRO INDEPENDENTE',
    ])
  })

  test('palavras em qualquer ordem e com acento', () => {
    assert.ok(subclasses('açougue carnes').includes('4722-9/01'))
    assert.ok(subclasses('carnes ACOUGUE').includes('4722-9/01'))
  })

  test('descrição casa antes da ocupação', () => {
    const found = subclasses('cabeleireiro')
    assert.ok(found.length > 0)
    const results = searchMeiCnaes('cabeleireiro')
    const firstOccupationOnly = results.findIndex(
      result => !result.cnae.denominacao.includes('CABELEIREIRO')
    )
    if (firstOccupationOnly >= 0) {
      assert.ok(
        results
          .slice(firstOccupationOnly)
          .every(result => !result.cnae.denominacao.includes('CABELEIREIRO'))
      )
    }
  })

  test('texto que não existe no anexo não traz resultado', () => {
    assert.deepEqual(subclasses('desenvolvimento de software'), [])
  })

  test('busca vazia devolve a lista inteira', () => {
    assert.equal(searchMeiCnaes('').length, MEI_CNAES.length)
    assert.equal(searchMeiCnaes('   ').length, MEI_CNAES.length)
  })
})

describe('findMeiCnae', () => {
  test('acha com e sem máscara; recusa código incompleto', () => {
    assert.equal(findMeiCnae('4724-5/00')?.subclasse, '4724-5/00')
    assert.equal(findMeiCnae('4724500')?.subclasse, '4724-5/00')
    assert.equal(findMeiCnae('4724'), undefined)
    assert.equal(findMeiCnae(''), undefined)
  })
})
