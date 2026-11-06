import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-425 (história PREF-633): o bloco "Critérios de aceitação da vaga" ganha
// o critério "Experiência em carteira", entre Idade e Escolaridade/Idioma,
// com ícone, título e a tag "Bloqueio ativo"/"Bloqueio desligado" ao lado do
// título. O switch liga e desliga o critério; ligado, mostra as opções
// "Qualquer tempo" e "Mínimo de 6 meses". Os fluxos que gravam a vaga enviam
// `experiencia_carteira` e a chave dela em `criterios_bloqueio`.

const COMPONENTS = '../../app/(private)/(app)/gorio/empregabilidade/components/'
const CRITERIOS_URL = new URL(
  `${COMPONENTS}criterios-elegibilidade.tsx`,
  import.meta.url
)
const FORM_URL = new URL(
  `${COMPONENTS}new-empregabilidade-form.tsx`,
  import.meta.url
)
const EMPREGABILIDADE = '../../app/(private)/(app)/gorio/empregabilidade/'
const EDICAO_URL = new URL(
  `${EMPREGABILIDADE}[empregabilidade-id]/page.tsx`,
  import.meta.url
)
const FLUXOS_QUE_GRAVAM_A_VAGA = [
  `${EMPREGABILIDADE}new/page.tsx`,
  `${EMPREGABILIDADE}[empregabilidade-id]/page.tsx`,
  `${COMPONENTS}duplicate-job-button.tsx`,
  `${COMPONENTS}empregabilidade-data-table.tsx`,
]

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { CriteriosElegibilidade } = await import(CRITERIOS_URL.href)

type ExperienciaCarteira = 'qualquer_tempo' | 'minimo_6_meses'

function render({
  experienciaCarteira,
  disabled = false,
}: {
  experienciaCarteira: ExperienciaCarteira | null
  disabled?: boolean
}): string {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(CriteriosElegibilidade, {
      // idade ligada mantém o bloco aberto também com o critério desligado
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
      opcaoPcd: 'aberta',
      onOpcaoPcdChange: noop,
      tiposPcdSelecionados: [],
      onTiposPcdChange: noop,
      tiposPcd: [],
      loadingTiposPcd: false,
      experienciaCarteira,
      onExperienciaCarteiraChange: noop,
      disabled,
    })
  )
}

function criterioExperiencia(html: string): string {
  const idade = html.indexOf('data-criterio="idade"')
  const inicio = html.indexOf('data-criterio="experiencia"')
  const fim = html.indexOf('data-criterio="escolaridade"')
  assert.ok(inicio >= 0, 'critério Experiência em carteira renderizado')
  assert.ok(idade >= 0 && idade < inicio, 'Idade vem antes')
  assert.ok(fim > inicio, 'Escolaridade vem depois')
  assert.ok(
    html.indexOf('data-criterio="idioma"') > fim,
    'Idioma vem depois de Escolaridade'
  )
  return html.slice(inicio, fim)
}

function botao(html: string, id: string): string {
  const tag = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0]
  assert.ok(tag, `botão #${id} renderizado`)
  return tag
}

function switchCriterio(html: string): string {
  return botao(html, 'criterio-experiencia-carteira')
}

describe('critério Experiência em carteira no bloco de critérios', () => {
  test('fica entre Idade e Escolaridade/Idioma', () => {
    criterioExperiencia(render({ experienciaCarteira: null }))
    criterioExperiencia(render({ experienciaCarteira: 'qualquer_tempo' }))
  })

  test('cabeçalho: ícone, título e a tag ao lado do título', () => {
    const html = criterioExperiencia(render({ experienciaCarteira: null }))
    const icone = html.search(/<svg[^>]*lucide-briefcase-business/)
    const titulo = html.indexOf('Experiência em carteira</label>')
    const tag = html.indexOf('Bloqueio desligado')
    assert.ok(icone >= 0, 'ícone renderizado')
    assert.ok(titulo > icone, 'título depois do ícone')
    assert.ok(tag > titulo, 'tag depois do título')
  })

  test('desligado: switch desmarcado, tag desligada, sem as opções', () => {
    const html = criterioExperiencia(render({ experienciaCarteira: null }))
    assert.match(switchCriterio(html), /aria-checked="false"/)
    assert.ok(html.includes('Bloqueio desligado'))
    assert.ok(!html.includes('Bloqueio ativo'))
    assert.ok(!html.includes('role="radiogroup"'))
    assert.ok(!html.includes('Qualquer tempo'))
    assert.ok(!html.includes('Mínimo de 6 meses'))
  })

  for (const [opcao, marcada, outra] of [
    ['qualquer_tempo', 'Qualquer tempo', 'minimo_6_meses'],
    ['minimo_6_meses', 'Mínimo de 6 meses', 'qualquer_tempo'],
  ] as const) {
    test(`ligado com ${opcao}: tag ativa e as duas opções, ${marcada} marcada`, () => {
      const html = criterioExperiencia(render({ experienciaCarteira: opcao }))
      assert.match(switchCriterio(html), /aria-checked="true"/)
      assert.ok(html.includes('Bloqueio ativo'))
      assert.ok(!html.includes('Bloqueio desligado'))
      assert.ok(html.includes('role="radiogroup"'))
      const qualquer = html.indexOf('>Qualquer tempo<')
      const minimo = html.indexOf('>Mínimo de 6 meses<')
      assert.ok(qualquer >= 0 && minimo > qualquer, 'as duas opções, na ordem')
      assert.match(
        botao(html, `experiencia-carteira-${opcao}`),
        /aria-checked="true"/
      )
      assert.match(
        botao(html, `experiencia-carteira-${outra}`),
        /aria-checked="false"/
      )
    })
  }

  test('somente leitura: switch e opções desabilitados', () => {
    const html = criterioExperiencia(
      render({ experienciaCarteira: 'minimo_6_meses', disabled: true })
    )
    assert.match(switchCriterio(html), /disabled=""/)
    for (const opcao of ['qualquer_tempo', 'minimo_6_meses']) {
      assert.match(botao(html, `experiencia-carteira-${opcao}`), /disabled=""/)
    }
  })
})

describe('Experiência em carteira nos fluxos que gravam a vaga', () => {
  for (const caminho of FLUXOS_QUE_GRAVAM_A_VAGA) {
    test(`${caminho.split('/').slice(-2).join('/')}: envia o tempo e o bloqueio`, () => {
      const fonte = readFileSync(new URL(caminho, import.meta.url), 'utf8')
      assert.match(
        fonte,
        /experiencia_carteira:\s*getExperienciaCarteiraParaApi\(/
      )
      assert.match(fonte, /experienciaCarteira:\s*\S/)
    })
  }

  test('edição lê o critério da vaga gravada', () => {
    const fonte = readFileSync(EDICAO_URL, 'utf8')
    assert.match(
      fonte,
      /experiencia_carteira:\s*getExperienciaCarteiraDaVaga\(vaga\)/
    )
  })

  test('formulário: criação começa com o critério desligado', () => {
    const fonte = readFileSync(FORM_URL, 'utf8')
    assert.match(fonte, /experiencia_carteira: null,/)
    assert.ok(fonte.includes('onExperienciaCarteiraChange'))
  })
})
