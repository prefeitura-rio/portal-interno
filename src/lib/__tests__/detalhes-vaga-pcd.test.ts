import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-419: o campo "Vaga PcD" dos detalhes da vaga no Banco de Currículos
// (histórico de candidaturas e diálogo "Associar vaga") mostra a opção PcD
// atual da vaga (`opcao_pcd`, DEV-407/DEV-408), com o de/para do campo
// descontinuado `acessibilidade_pcd` só para vagas antigas.

const DETALHES_URL = new URL(
  '../../app/(private)/(app)/gorio/banco-curriculos/components/detalhes-vaga.tsx',
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { DetalhesVaga } = await import(DETALHES_URL.href)

function vagaPcd(vaga: Record<string, unknown>): string {
  const html = renderToStaticMarkup(createElement(DetalhesVaga, { vaga }))
  const campo = html.match(
    /<dt[^>]*>Vaga PcD<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/
  )?.[1]
  assert.ok(campo !== undefined, 'campo "Vaga PcD" renderizado')
  return campo
}

describe('DetalhesVaga: campo "Vaga PcD"', () => {
  test('vaga preferencial (opcao_pcd) não aparece como "Não"', () => {
    assert.equal(
      vagaPcd({ opcao_pcd: 'preferencial' }),
      'Preferencial para PcD'
    )
  })

  test('vaga exclusiva (opcao_pcd)', () => {
    assert.equal(vagaPcd({ opcao_pcd: 'exclusiva' }), 'Exclusiva para PcD')
  })

  test('vaga aberta a todos (opcao_pcd)', () => {
    assert.equal(vagaPcd({ opcao_pcd: 'aberta' }), 'Não, é aberta a todos')
  })

  test('opcao_pcd prevalece sobre o campo descontinuado', () => {
    assert.equal(
      vagaPcd({ opcao_pcd: 'aberta', acessibilidade_pcd: 'exclusivo_pcd' }),
      'Não, é aberta a todos'
    )
  })

  test('vaga antiga sem opcao_pcd usa o de/para de acessibilidade_pcd', () => {
    assert.equal(
      vagaPcd({ acessibilidade_pcd: 'exclusivo_pcd' }),
      'Exclusiva para PcD'
    )
    assert.equal(
      vagaPcd({ acessibilidade_pcd: 'preferencial_pcd' }),
      'Preferencial para PcD'
    )
    assert.equal(
      vagaPcd({ acessibilidade_pcd: 'para_pcd' }),
      'Preferencial para PcD'
    )
    assert.equal(vagaPcd({}), 'Não, é aberta a todos')
  })
})
