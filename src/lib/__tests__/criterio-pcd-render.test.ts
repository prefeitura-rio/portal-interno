import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-408: o critério PcD do bloco "Critérios de aceitação da vaga" mostra a
// pergunta de 3 opções, a lista de tipos com "Todos os tipos", o erro da
// exclusiva sem tipo, a tag de bloqueio e, na exclusiva com o bloqueio
// desligado, o alerta "Bloqueio ainda não ativado" e o botão "Ativar
// bloqueio". Os campos antigos saem do formulário.

const COMPONENTS = '../../app/(private)/(app)/gorio/empregabilidade/components/'
const CRITERIOS_URL = new URL(
  `${COMPONENTS}criterios-elegibilidade.tsx`,
  import.meta.url
)
const FORM_URL = new URL(
  `${COMPONENTS}new-empregabilidade-form.tsx`,
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { CriteriosElegibilidade } = await import(CRITERIOS_URL.href)

const TIPOS = [
  { id: 'tipo-auditiva', descricao: 'Auditiva' },
  { id: 'tipo-visual', descricao: 'Visual' },
]

type OpcaoPcd = 'aberta' | 'preferencial' | 'exclusiva'

function render({
  opcaoPcd,
  tipos = [],
  bloqueio = false,
  disabled = false,
}: {
  opcaoPcd: OpcaoPcd
  tipos?: string[]
  bloqueio?: boolean
  disabled?: boolean
}): string {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(CriteriosElegibilidade, {
      // idade ligada mantém o bloco aberto também na vaga aberta a todos
      idadeMinima: true,
      onIdadeMinimaChange: noop,
      idEscolaridadeMinima: undefined,
      onEscolaridadeChange: noop,
      idiomasRequisito: [],
      onIdiomasChange: noop,
      escolaridades: [],
      idiomas: [],
      niveisIdioma: [],
      loadingEscolaridades: false,
      loadingIdiomas: false,
      loadingNiveis: false,
      opcaoPcd,
      onOpcaoPcdChange: noop,
      tiposPcdSelecionados: tipos,
      onTiposPcdChange: noop,
      bloqueioPcd: bloqueio,
      onBloqueioPcdChange: noop,
      tiposPcd: TIPOS,
      loadingTiposPcd: false,
      disabled,
    })
  )
}

function criterioPcd(html: string): string {
  const inicio = html.indexOf('data-criterio="pcd"')
  const fim = html.indexOf('data-criterio="idade"')
  assert.ok(inicio >= 0, 'critério PcD renderizado')
  assert.ok(fim > inicio, 'PcD vem antes de Idade')
  return html.slice(inicio, fim)
}

function checkboxTodos(html: string): string {
  const botao = html.match(/<button[^>]*id="tipo-pcd-todos"[^>]*>/)?.[0]
  assert.ok(botao, 'checkbox "Todos os tipos" renderizado')
  return botao
}

describe('critério PcD no bloco de critérios', () => {
  test('pergunta com as 3 opções, na ordem', () => {
    const html = criterioPcd(render({ opcaoPcd: 'aberta' }))
    const posicoes = [
      'Não, é aberta a todos',
      'Preferencial para PcD',
      'Exclusiva para PcD',
    ].map(label => html.indexOf(label))
    assert.ok(posicoes.every(p => p >= 0))
    assert.deepEqual(
      [...posicoes].sort((a, b) => a - b),
      posicoes
    )
  })

  test('aberta: sem lista de tipos, sem alerta, bloqueio desligado', () => {
    const html = criterioPcd(render({ opcaoPcd: 'aberta' }))
    assert.ok(!html.includes('Todos os tipos'))
    assert.ok(!html.includes('Bloqueio ainda não ativado'))
    assert.ok(html.includes('Bloqueio desligado'))
  })

  test('preferencial: lista de tipos com "Todos os tipos", sem erro nem alerta', () => {
    const html = criterioPcd(render({ opcaoPcd: 'preferencial' }))
    assert.ok(html.includes('Todos os tipos'))
    assert.ok(html.includes('Auditiva'))
    assert.ok(html.includes('Visual'))
    assert.ok(!html.includes('Selecione ao menos um tipo de deficiência.'))
    assert.ok(!html.includes('Bloqueio ainda não ativado'))
    assert.ok(html.includes('Bloqueio desligado'))
  })

  test('exclusiva sem tipo: erro, alerta e botão "Ativar bloqueio"', () => {
    const html = criterioPcd(render({ opcaoPcd: 'exclusiva' }))
    assert.ok(html.includes('Selecione ao menos um tipo de deficiência.'))
    assert.ok(html.includes('Bloqueio desligado'))
    assert.ok(html.includes('Bloqueio ainda não ativado'))
    assert.match(html, /<button[^>]*>Ativar bloqueio<\/button>/)
  })

  test('exclusiva com tipo e bloqueio desligado: alerta sem erro', () => {
    const html = criterioPcd(
      render({ opcaoPcd: 'exclusiva', tipos: ['tipo-visual'] })
    )
    assert.ok(!html.includes('Selecione ao menos um tipo de deficiência.'))
    assert.ok(html.includes('Bloqueio ainda não ativado'))
    assert.ok(html.includes('Ativar bloqueio'))
  })

  test('exclusiva com bloqueio ligado: tag "Bloqueio ativo", sem alerta', () => {
    const html = criterioPcd(
      render({ opcaoPcd: 'exclusiva', tipos: ['tipo-visual'], bloqueio: true })
    )
    assert.ok(html.includes('Bloqueio ativo'))
    assert.ok(!html.includes('Bloqueio desligado'))
    assert.ok(!html.includes('Bloqueio ainda não ativado'))
    assert.ok(!html.includes('Ativar bloqueio'))
  })

  test('todos os tipos marcados marcam "Todos os tipos"', () => {
    const html = criterioPcd(
      render({
        opcaoPcd: 'preferencial',
        tipos: ['tipo-auditiva', 'tipo-visual'],
      })
    )
    assert.match(checkboxTodos(html), /data-state="checked"/)
    const parcial = criterioPcd(
      render({ opcaoPcd: 'preferencial', tipos: ['tipo-visual'] })
    )
    assert.match(checkboxTodos(parcial), /data-state="unchecked"/)
  })

  test('somente leitura: botão "Ativar bloqueio" desabilitado', () => {
    const html = criterioPcd(render({ opcaoPcd: 'exclusiva', disabled: true }))
    assert.match(html, /<button[^>]*disabled=""[^>]*>Ativar bloqueio<\/button>/)
  })
})

describe('campos antigos fora do formulário da vaga', () => {
  const fonte = readFileSync(FORM_URL, 'utf8')

  for (const antigo of [
    'Vaga PcD',
    'Acessibilidade PcD',
    'Tipo de Deficiência (PcD)',
    'name="vaga_pcd"',
    'name="acessibilidade_pcd"',
  ]) {
    test(`sem "${antigo}"`, () => {
      assert.ok(!fonte.includes(antigo))
    })
  }
})
