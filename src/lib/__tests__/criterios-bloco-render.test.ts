import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-442 (handoff "ajustes finais da homologação", PREF-631/632/633): com o
// master "Ativar critérios de aceitação da vaga" desligado, o bloco mostra
// todos os critérios esmaecidos e sem ação. Escolaridade mínima e Idioma
// estrangeiro são critérios completos (ícone, título, tag e switch), com as
// opções sempre à mostra.

const COMPONENTS = '../../app/(private)/(app)/gorio/empregabilidade/components/'
const CRITERIOS_URL = new URL(
  `${COMPONENTS}criterios-elegibilidade.tsx`,
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { CriteriosElegibilidade } = await import(CRITERIOS_URL.href)

const ESCOLARIDADES = [
  { id: 'esc-fundamental', descricao: 'Fundamental completo' },
  { id: 'esc-medio', descricao: 'Médio completo' },
]
const IDIOMAS = [
  { id: 'idioma-ingles', descricao: 'Inglês' },
  { id: 'idioma-espanhol', descricao: 'Espanhol' },
]
const NIVEIS = [{ id: 'nivel-intermediario', descricao: 'Intermediário' }]

const CRITERIOS = ['pcd', 'idade', 'experiencia', 'escolaridade', 'idioma']

function render({
  idadeMinima = false,
  idEscolaridadeMinima,
  idiomasRequisito = [],
  disabled = false,
}: {
  idadeMinima?: boolean
  idEscolaridadeMinima?: string
  idiomasRequisito?: { id_idioma: string; id_nivel_minimo: string }[]
  disabled?: boolean
} = {}): string {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(CriteriosElegibilidade, {
      idadeMinima,
      onIdadeMinimaChange: noop,
      idEscolaridadeMinima,
      onEscolaridadeChange: noop,
      idiomasRequisito,
      onIdiomasChange: noop,
      escolaridades: ESCOLARIDADES,
      idiomas: IDIOMAS,
      niveisIdioma: NIVEIS,
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
      jovemAprendiz: false,
      onJovemAprendizChange: noop,
      disabled,
    })
  )
}

function criterio(html: string, id: string): string {
  const inicio = html.indexOf(`data-criterio="${id}"`)
  assert.ok(inicio >= 0, `critério ${id} renderizado`)
  const proximo = html.indexOf('data-criterio="', inicio + 1)
  return html.slice(inicio, proximo >= 0 ? proximo : undefined)
}

function tags(html: string, padrao: RegExp): string[] {
  return html.match(new RegExp(padrao.source, 'g')) ?? []
}

function cabecalho(html: string, id: string): string {
  const fim = html.indexOf(`data-opcoes-criterio="${id}"`)
  assert.ok(fim >= 0, `opções de ${id} renderizadas`)
  return html.slice(0, fim)
}

function botao(html: string, id: string): string {
  const tag = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0]
  assert.ok(tag, `botão #${id} renderizado`)
  return tag
}

describe('master desligado', () => {
  test('mostra todos os critérios, na ordem, esmaecidos', () => {
    const html = render()
    assert.match(
      html,
      /data-criterios-master="desligado" aria-disabled="true" class="[^"]*opacity-50/
    )
    let anterior = -1
    for (const id of CRITERIOS) {
      const posicao = html.indexOf(`data-criterio="${id}"`)
      assert.ok(posicao > anterior, `${id} renderizado na ordem`)
      anterior = posicao
    }
  })

  test('sem ação: todos os controles dos critérios desabilitados', () => {
    const html = render()
    const lista = html.slice(html.indexOf('data-criterios-master'))
    const controles = tags(
      lista,
      /<button[^>]*role="(switch|radio|checkbox|combobox)"[^>]*>/
    )
    assert.ok(controles.length >= 12, 'switches, rádios, checkboxes e select')
    for (const controle of controles) assert.match(controle, /disabled=""/)
  })

  test('só o PcD (opção padrão "aberta a todos") vem marcado', () => {
    const html = render()
    const marcados = tags(html, /<button[^>]*aria-checked="true"[^>]*>/)
    assert.equal(marcados.length, 1)
    assert.match(marcados[0], /id="opcao-pcd-aberta"/)
    for (const id of ['idade', 'experiencia', 'escolaridade', 'idioma']) {
      assert.match(criterio(html, id), /data-esmaecidas="false"/)
    }
  })

  test('o switch master continua com ação', () => {
    const html = render()
    const master = html.slice(0, html.indexOf('data-criterios-master'))
    const chave = tags(master, /<button[^>]*role="switch"[^>]*>/)
    assert.equal(chave.length, 1)
    assert.match(chave[0], /aria-checked="false"/)
    assert.doesNotMatch(chave[0], /disabled=""/)
  })

  test('master ligado: lista sem esmaecer e switches com ação', () => {
    const html = render({ idadeMinima: true })
    assert.match(html, /data-criterios-master="ligado"/)
    assert.doesNotMatch(html, /aria-disabled="true"/)
    for (const id of [
      'criterio-idade',
      'criterio-experiencia-carteira',
      'criterio-escolaridade',
      'criterio-idioma',
    ]) {
      assert.doesNotMatch(botao(html, id), /disabled=""/)
    }
  })
})

describe('Escolaridade mínima como critério completo', () => {
  test('cabeçalho: ícone, título, tag e switch', () => {
    const topo = cabecalho(
      criterio(render({ idadeMinima: true }), 'escolaridade'),
      'escolaridade'
    )
    const icone = topo.search(/<svg[^>]*lucide-graduation-cap/)
    const titulo = topo.indexOf('>Escolaridade mínima</label>')
    const tag = topo.indexOf('Bloqueio desligado')
    assert.ok(icone >= 0 && titulo > icone && tag > titulo)
    assert.match(botao(topo, 'criterio-escolaridade'), /role="switch"/)
    assert.ok(!topo.includes('Possuir escolaridade mínima'), 'rótulo antigo')
  })

  test('desligada: select à mostra, esmaecido, sem ação e sem valor', () => {
    const html = criterio(render({ idadeMinima: true }), 'escolaridade')
    assert.match(botao(html, 'criterio-escolaridade'), /aria-checked="false"/)
    assert.match(html, /data-esmaecidas="true" class="[^"]*opacity-50/)
    assert.match(botao(html, 'criterio-escolaridade-opcao'), /disabled=""/)
    assert.ok(html.includes('Selecione a escolaridade mínima'))
  })

  test('ligada: tag ativa, select com ação e a escolaridade escolhida', () => {
    const html = criterio(
      render({ idadeMinima: true, idEscolaridadeMinima: 'esc-medio' }),
      'escolaridade'
    )
    assert.match(botao(html, 'criterio-escolaridade'), /aria-checked="true"/)
    assert.ok(html.includes('Bloqueio ativo'))
    assert.match(html, /data-esmaecidas="false"/)
    assert.doesNotMatch(
      botao(html, 'criterio-escolaridade-opcao'),
      /disabled=""/
    )
  })
})

describe('Idioma estrangeiro como critério completo', () => {
  test('cabeçalho: ícone, título, tag e switch', () => {
    const topo = cabecalho(
      criterio(render({ idadeMinima: true }), 'idioma'),
      'idioma'
    )
    const icone = topo.search(/<svg[^>]*lucide-languages/)
    const titulo = topo.indexOf('>Idioma estrangeiro</label>')
    const tag = topo.indexOf('Bloqueio desligado')
    assert.ok(icone >= 0 && titulo > icone && tag > titulo)
    assert.match(botao(topo, 'criterio-idioma'), /role="switch"/)
    assert.ok(!topo.includes('Dominar idioma estrangeiro'), 'rótulo antigo')
  })

  test('desligado: lista de idiomas à mostra, esmaecida, sem ação e sem marca', () => {
    const html = criterio(render({ idadeMinima: true }), 'idioma')
    assert.match(botao(html, 'criterio-idioma'), /aria-checked="false"/)
    assert.match(html, /data-esmaecidas="true" class="[^"]*opacity-50/)
    for (const idioma of IDIOMAS) {
      const caixa = botao(html, `idioma-${idioma.id}`)
      assert.match(caixa, /aria-checked="false"/)
      assert.match(caixa, /disabled=""/)
      assert.ok(html.includes(`>${idioma.descricao}</label>`))
    }
    assert.ok(!html.includes('Ative o toggle acima'), 'aviso antigo removido')
  })

  test('ligado com Inglês: tag ativa, idiomas com ação e o nível do Inglês', () => {
    const html = criterio(
      render({
        idadeMinima: true,
        idiomasRequisito: [
          {
            id_idioma: 'idioma-ingles',
            id_nivel_minimo: 'nivel-intermediario',
          },
        ],
      }),
      'idioma'
    )
    assert.match(botao(html, 'criterio-idioma'), /aria-checked="true"/)
    assert.ok(html.includes('Bloqueio ativo'))
    assert.match(html, /data-esmaecidas="false"/)
    assert.match(botao(html, 'idioma-idioma-ingles'), /aria-checked="true"/)
    assert.doesNotMatch(botao(html, 'idioma-idioma-espanhol'), /disabled=""/)
    assert.equal(tags(html, /role="combobox"/).length, 1, 'nível do Inglês')
  })
})

describe('somente leitura', () => {
  test('switches de Escolaridade e Idioma desabilitados', () => {
    const html = render({
      idadeMinima: true,
      idEscolaridadeMinima: 'esc-medio',
      disabled: true,
    })
    assert.match(botao(html, 'criterio-escolaridade'), /disabled=""/)
    assert.match(botao(html, 'criterio-escolaridade-opcao'), /disabled=""/)
    assert.match(botao(html, 'criterio-idioma'), /disabled=""/)
  })
})
