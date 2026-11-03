import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'

// DEV-195: o seletor de empresa da vaga (empresa-combobox.tsx) descartava as
// letras do CNPJ: a busca por um CNPJ alfanumérico caía na busca por nome e a
// lista mostrava o CNPJ sem máscara. CNPJs sintéticos.

const SRC_ROOT = new URL('../../', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const { getEmpresaSearchParams } = await import('../empresa-search.ts')
const { formatCNPJ } = await import('../cnpj-validator.ts')

// 12ABC34501DE + dígitos verificadores 35 (exemplo da Receita Federal)
const ALPHANUMERIC_CNPJ = '12ABC34501DE35'
const ALPHANUMERIC_CNPJ_MASKED = '12.ABC.345/01DE-35'

describe('busca por CNPJ alfanumérico', () => {
  test('o CNPJ completo com máscara vira o parâmetro cnpj, sem perder letras', () => {
    assert.deepEqual(getEmpresaSearchParams(ALPHANUMERIC_CNPJ_MASKED), {
      cnpj: ALPHANUMERIC_CNPJ,
    })
  })

  test('sem máscara, em minúsculas e com espaços também', () => {
    assert.deepEqual(getEmpresaSearchParams(ALPHANUMERIC_CNPJ), {
      cnpj: ALPHANUMERIC_CNPJ,
    })
    assert.deepEqual(getEmpresaSearchParams('  12.abc.345/01de-35 '), {
      cnpj: ALPHANUMERIC_CNPJ,
    })
  })

  test('CNPJ alfanumérico incompleto ou com dígito verificador errado busca por nome', () => {
    assert.deepEqual(getEmpresaSearchParams('12.ABC.345/01DE'), {
      search: '12.ABC.345/01DE',
    })
    assert.deepEqual(getEmpresaSearchParams('12.ABC.345/01DE-36'), {
      search: '12.ABC.345/01DE-36',
    })
  })

  test('nome com 12 letras e 2 dígitos continua sendo busca por nome', () => {
    assert.deepEqual(getEmpresaSearchParams('Supermercado 24'), {
      search: 'Supermercado 24',
    })
  })
})

describe('CNPJ numérico segue igual', () => {
  test('14 dígitos com ou sem máscara viram o parâmetro cnpj', () => {
    assert.deepEqual(getEmpresaSearchParams('11.222.333/0001-81'), {
      cnpj: '11222333000181',
    })
    assert.deepEqual(getEmpresaSearchParams('11222333000181'), {
      cnpj: '11222333000181',
    })
  })

  test('mais de 14 dígitos usa os 14 primeiros, como antes', () => {
    assert.deepEqual(getEmpresaSearchParams('112223330001819'), {
      cnpj: '11222333000181',
    })
  })

  test('CNPJ numérico com dígito verificador errado continua indo como cnpj', () => {
    assert.deepEqual(getEmpresaSearchParams('12345678901234'), {
      cnpj: '12345678901234',
    })
  })

  test('menos de 14 dígitos busca por nome', () => {
    assert.deepEqual(getEmpresaSearchParams('11.222.333'), {
      search: '11.222.333',
    })
  })
})

describe('busca por nome', () => {
  test('texto vazio não filtra', () => {
    assert.equal(getEmpresaSearchParams(''), null)
    assert.equal(getEmpresaSearchParams('   '), null)
  })

  test('nome vai aparado no parâmetro search', () => {
    assert.deepEqual(getEmpresaSearchParams('  Padaria Fictícia  '), {
      search: 'Padaria Fictícia',
    })
  })
})

describe('CNPJ exibido na lista do seletor', () => {
  test('CNPJ alfanumérico aparece com a máscara XX.XXX.XXX/XXXX-XX', () => {
    assert.equal(formatCNPJ(ALPHANUMERIC_CNPJ), ALPHANUMERIC_CNPJ_MASKED)
  })

  test('CNPJ numérico aparece com a máscara, como antes', () => {
    assert.equal(formatCNPJ('11222333000181'), '11.222.333/0001-81')
    assert.equal(formatCNPJ('11.222.333/0001-81'), '11.222.333/0001-81')
  })

  test('valor fora do formato de CNPJ aparece como está', () => {
    assert.equal(formatCNPJ('123'), '123')
  })
})
