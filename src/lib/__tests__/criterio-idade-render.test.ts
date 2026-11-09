import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-429 (história PREF-634): a seção Idade do bloco "Critérios de aceitação
// da vaga" mostra duas opções, "Maiores de 18" e "Jovem Aprendiz" (faixa fixa
// de 14 a 24 anos), sem campo livre de número de idade. Cada opção tem o
// switch e a tag "Bloqueio ativo"/"Bloqueio desligado". A seção fica na
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

const MAIORES = 'criterio-idade-minima'
const JOVEM = 'criterio-jovem-aprendiz'

describe('seção Idade no bloco de critérios', () => {
  test('fica na posição de Idade: depois de PcD, antes de Experiência', () => {
    criterioIdade(render({ idadeMinima: false, jovemAprendiz: false }))
    criterioIdade(render({ idadeMinima: true, jovemAprendiz: true }))
  })

  test('título Idade e as duas opções, na ordem, sem campo de número', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: false })
    )
    assert.match(html, /<svg[^>]*lucide-cake/)
    const titulo = html.indexOf('>Idade</p>')
    const maiores = html.indexOf('>Maiores de 18</label>')
    const jovem = html.indexOf('>Jovem Aprendiz</label>')
    assert.ok(titulo >= 0, 'título Idade')
    assert.ok(maiores > titulo, 'Maiores de 18 depois do título')
    assert.ok(jovem > maiores, 'Jovem Aprendiz depois de Maiores de 18')
    assert.ok(html.includes('Candidatos com 18 anos ou mais.'))
    assert.ok(html.includes('Candidatos de 14 a 24 anos.'))
    // o único <input> é o checkbox oculto que o Radix põe ao lado do switch
    assert.ok(
      !/<input(?![^>]*type="checkbox"[^>]*aria-hidden="true")/.test(html),
      'sem campo livre de idade'
    )
    assert.ok(!html.includes('type="number"'), 'sem campo de número')
    assert.ok(!html.includes('Ter idade mínima'), 'rótulo antigo removido')
  })

  test('cada opção tem o seu switch e a sua tag de bloqueio', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: false })
    )
    for (const id of [MAIORES, JOVEM]) {
      const trecho = opcao(html, id)
      assert.match(botao(trecho, id), /role="switch"/)
      assert.match(botao(trecho, id), /aria-checked="false"/)
      assert.ok(trecho.includes('Bloqueio desligado'))
      assert.ok(!trecho.includes('Bloqueio ativo'))
    }
  })

  test('vaga existente (Jovem Aprendiz desligado) com Maiores de 18 ligado', () => {
    const html = criterioIdade(
      render({ idadeMinima: true, jovemAprendiz: false })
    )
    const maiores = opcao(html, MAIORES)
    assert.match(botao(maiores, MAIORES), /aria-checked="true"/)
    assert.ok(maiores.includes('Bloqueio ativo'))
    const jovem = opcao(html, JOVEM)
    assert.match(botao(jovem, JOVEM), /aria-checked="false"/)
    assert.ok(jovem.includes('Bloqueio desligado'))
  })

  test('Jovem Aprendiz ligado: switch marcado e tag ativa', () => {
    const html = criterioIdade(
      render({ idadeMinima: false, jovemAprendiz: true })
    )
    const jovem = opcao(html, JOVEM)
    assert.match(botao(jovem, JOVEM), /aria-checked="true"/)
    assert.ok(jovem.includes('Bloqueio ativo'))
    assert.ok(!jovem.includes('Bloqueio desligado'))
    assert.ok(opcao(html, MAIORES).includes('Bloqueio desligado'))
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
    assert.ok(html.includes('data-criterio="idade"'))
  })

  test('somente leitura: os dois switches desabilitados', () => {
    const html = criterioIdade(
      render({ idadeMinima: true, jovemAprendiz: true, disabled: true })
    )
    assert.match(botao(html, MAIORES), /disabled=""/)
    assert.match(botao(html, JOVEM), /disabled=""/)
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
