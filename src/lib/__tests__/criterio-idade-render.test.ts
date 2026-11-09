import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-429 (história PREF-634): a seção Idade do bloco "Critérios de aceitação
// da vaga" mostra duas opções, "Maiores de 18" e "Jovem Aprendiz" (faixa fixa
// de 14 a 24 anos), sem campo livre de número de idade. Desde a DEV-442 a
// Idade tem um switch e uma tag só, e as opções são escolha única. A seção fica na
// posição de Idade (depois de PcD, antes de Experiência em carteira). Os
// fluxos que gravam a vaga enviam `jovem_aprendiz` e a chave dela em
// `criterios_bloqueio`.

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

function render({
  idadeMinima,
  jovemAprendiz,
  disabled = false,
}: {
  idadeMinima: boolean
  jovemAprendiz: boolean
  disabled?: boolean
}): string {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(CriteriosElegibilidade, {
      idadeMinima,
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
      // experiência ligada mantém o bloco aberto também com a Idade desligada
      experienciaCarteira: 'qualquer_tempo',
      onExperienciaCarteiraChange: noop,
      jovemAprendiz,
      onJovemAprendizChange: noop,
      disabled,
    })
  )
}

function criterioIdade(html: string): string {
  const pcd = html.indexOf('data-criterio="pcd"')
  const inicio = html.indexOf('data-criterio="idade"')
  const fim = html.indexOf('data-criterio="experiencia"')
  assert.ok(inicio >= 0, 'seção Idade renderizada')
  assert.ok(pcd >= 0 && pcd < inicio, 'PcD vem antes')
  assert.ok(fim > inicio, 'Experiência em carteira vem depois')
  return html.slice(inicio, fim)
}

function opcao(html: string, id: string): string {
  const inicio = html.indexOf(`data-opcao-idade="${id}"`)
  assert.ok(inicio >= 0, `opção ${id} renderizada`)
  const proxima = html.indexOf('data-opcao-idade=', inicio + 1)
  return html.slice(inicio, proxima >= 0 ? proxima : undefined)
}

function botao(html: string, id: string): string {
  const tag = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0]
  assert.ok(tag, `botão #${id} renderizado`)
  return tag
}

function cabecalho(html: string): string {
  const fim = html.indexOf('data-opcoes-criterio="idade"')
  assert.ok(fim >= 0, 'opções da Idade renderizadas')
  return html.slice(0, fim)
}

// DEV-442 (handoff PREF-631/632/633): Idade é um critério só, com um switch
// e a tag no cabeçalho, e uma escolha única entre as duas opções.
const SWITCH = 'criterio-idade'
const MAIORES = 'maiores_de_18'
const JOVEM = 'jovem_aprendiz'
const radio = (id: string) => `criterio-idade-${id}`

describe('seção Idade no bloco de critérios', () => {
  test('fica na posição de Idade: depois de PcD, antes de Experiência', () => {
    criterioIdade(render({ idadeMinima: false, jovemAprendiz: false }))
    criterioIdade(render({ idadeMinima: true, jovemAprendiz: false }))
  })

  test('cabeçalho: ícone, título Idade, tag e um único switch', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: false })
    )
    const topo = cabecalho(html)
    const icone = topo.search(/<svg[^>]*lucide-cake/)
    const titulo = topo.indexOf('>Idade</label>')
    const tag = topo.indexOf('Bloqueio desligado')
    assert.ok(icone >= 0, 'ícone')
    assert.ok(titulo > icone, 'título depois do ícone')
    assert.ok(tag > titulo, 'tag depois do título')
    assert.match(botao(topo, SWITCH), /role="switch"/)
    assert.equal(html.match(/role="switch"/g)?.length, 1, 'um switch só')
  })

  test('as duas opções em escolha única, na ordem, sem campo de número', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: false })
    )
    assert.ok(html.includes('role="radiogroup"'))
    const maiores = html.indexOf('>Maiores de 18</label>')
    const jovem = html.indexOf('>Jovem Aprendiz</label>')
    assert.ok(maiores >= 0, 'Maiores de 18')
    assert.ok(jovem > maiores, 'Jovem Aprendiz depois de Maiores de 18')
    assert.ok(html.includes('Candidatos com 18 anos ou mais.'))
    assert.ok(html.includes('Candidatos de 14 a 24 anos.'))
    for (const id of [MAIORES, JOVEM]) {
      assert.match(botao(opcao(html, id), radio(id)), /role="radio"/)
      assert.ok(!opcao(html, id).includes('Bloqueio'), 'sem tag por opção')
    }
    assert.ok(!html.includes('type="number"'), 'sem campo de número')
    assert.ok(!html.includes('Ter idade mínima'), 'rótulo antigo removido')
  })

  test('desligada: tag desligada e opções à mostra, esmaecidas, sem ação e sem marca', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: false })
    )
    assert.match(botao(html, SWITCH), /aria-checked="false"/)
    assert.ok(html.includes('Bloqueio desligado'))
    assert.ok(!html.includes('Bloqueio ativo'))
    assert.match(
      html,
      /data-opcoes-criterio="idade" data-esmaecidas="true" class="[^"]*opacity-50/
    )
    for (const id of [MAIORES, JOVEM]) {
      assert.match(botao(html, radio(id)), /aria-checked="false"/)
      assert.match(botao(html, radio(id)), /disabled=""/)
    }
  })

  for (const [idadeMinima, jovemAprendiz, marcada, outra] of [
    [true, false, MAIORES, JOVEM],
    [false, true, JOVEM, MAIORES],
  ] as const) {
    test(`ligada com ${marcada}: tag ativa, só ${marcada} marcada`, () => {
      const html = criterioIdade(render({ idadeMinima, jovemAprendiz }))
      assert.match(botao(html, SWITCH), /aria-checked="true"/)
      assert.ok(cabecalho(html).includes('Bloqueio ativo'))
      assert.ok(!html.includes('Bloqueio desligado'))
      assert.match(html, /data-esmaecidas="false"/)
      assert.match(botao(html, radio(marcada)), /aria-checked="true"/)
      assert.match(botao(html, radio(outra)), /aria-checked="false"/)
      assert.doesNotMatch(botao(html, radio(outra)), /disabled=""/)
    })
  }

  test('vaga antiga com as duas opções ligadas: nenhuma marcada', () => {
    const html = criterioIdade(
      render({ idadeMinima: true, jovemAprendiz: true })
    )
    assert.match(botao(html, SWITCH), /aria-checked="true"/)
    for (const id of [MAIORES, JOVEM]) {
      assert.match(botao(html, radio(id)), /aria-checked="false"/)
    }
  })

  test('Jovem Aprendiz ligado sozinho abre o bloco de critérios', () => {
    const noop = () => {}
    const html = renderToStaticMarkup(
      createElement(CriteriosElegibilidade, {
        idadeMinima: false,
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
        experienciaCarteira: null,
        onExperienciaCarteiraChange: noop,
        jovemAprendiz: true,
        onJovemAprendizChange: noop,
      })
    )
    assert.ok(html.includes('data-criterios-master="ligado"'))
    assert.ok(html.includes('data-criterio="idade"'))
  })

  test('somente leitura: switch e opções desabilitados', () => {
    const html = criterioIdade(
      render({ idadeMinima: true, jovemAprendiz: false, disabled: true })
    )
    assert.match(botao(html, SWITCH), /disabled=""/)
    assert.match(botao(html, radio(MAIORES)), /disabled=""/)
    assert.match(botao(html, radio(JOVEM)), /disabled=""/)
  })
})

describe('Jovem Aprendiz nos fluxos que gravam a vaga', () => {
  for (const caminho of FLUXOS_QUE_GRAVAM_A_VAGA) {
    test(`${caminho.split('/').slice(-2).join('/')}: envia a opção e o bloqueio`, () => {
      const fonte = readFileSync(new URL(caminho, import.meta.url), 'utf8')
      assert.match(fonte, /jovem_aprendiz:\s*getJovemAprendizParaApi\(/)
      assert.match(fonte, /jovemAprendiz:\s*\S/)
    })
  }

  test('edição lê a opção da vaga gravada', () => {
    const fonte = readFileSync(EDICAO_URL, 'utf8')
    assert.match(fonte, /jovem_aprendiz:\s*getJovemAprendizDaVaga\(vaga\)/)
  })

  test('formulário: criação começa com Jovem Aprendiz desligado', () => {
    const fonte = readFileSync(FORM_URL, 'utf8')
    assert.match(fonte, /jovem_aprendiz: false,/)
    assert.ok(fonte.includes('onJovemAprendizChange'))
  })
})
