import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-408: o critério PcD do bloco "Critérios de aceitação da vaga" mostra a
// pergunta de 3 opções e a lista de tipos com "Todos os tipos". Os campos
// antigos saem do formulário.
// DEV-422 (homologação do PREF-632/640): cabeçalho com ícone, título e tag;
// pergunta e descrições novas; tipos logo abaixo da opção marcada, num campo
// "Selecione os tipos" com chips e a lista à mostra quando nada está marcado;
// a exclusiva já liga o bloqueio, com uma linha curta de aviso, sem o alerta
// "Bloqueio ainda não ativado" nem o botão "Ativar bloqueio".

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

const TIPOS = [
  { id: 'tipo-auditiva', descricao: 'Auditiva' },
  { id: 'tipo-visual', descricao: 'Visual' },
]

type OpcaoPcd = 'aberta' | 'preferencial' | 'exclusiva'

function render({
  opcaoPcd,
  tipos = [],
  disabled = false,
  erroTiposPcd,
  loadingTiposPcd = false,
}: {
  opcaoPcd: OpcaoPcd
  tipos?: string[]
  disabled?: boolean
  erroTiposPcd?: string
  loadingTiposPcd?: boolean
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
      erroTiposPcd,
      tiposPcd: TIPOS,
      loadingTiposPcd,
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

/** Trecho de uma opção: do seu bloco até o bloco da próxima (ou o fim). */
function opcaoPcdHtml(html: string, opcao: OpcaoPcd): string {
  const inicio = html.indexOf(`data-opcao-pcd="${opcao}"`)
  assert.ok(inicio >= 0, `opção ${opcao} renderizada`)
  const proxima = html.indexOf('data-opcao-pcd="', inicio + 1)
  return html.slice(inicio, proxima > inicio ? proxima : undefined)
}

function checkboxTodos(html: string): string {
  const botao = html.match(/<button[^>]*id="tipo-pcd-todos"[^>]*>/)?.[0]
  assert.ok(botao, 'checkbox "Todos os tipos" renderizado')
  return botao
}

function campoTipos(html: string): string {
  const inicio = html.indexOf('role="combobox"')
  assert.ok(inicio >= 0, 'campo "Selecione os tipos" renderizado')
  const abre = html.lastIndexOf('<button', inicio)
  const fecha = html.indexOf('</button>', inicio)
  return html.slice(abre, fecha)
}

const AVISO_EXCLUSIVA =
  'Quem não declarou deficiência no cadastro não consegue se candidatar.'

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

  test('cabeçalho: ícone, título "Pessoas com deficiência" e a tag ao lado', () => {
    const html = criterioPcd(render({ opcaoPcd: 'aberta' }))
    assert.match(html, /<svg[^>]*lucide-accessibility/)
    const titulo = html.indexOf('Pessoas com deficiência</p>')
    const tag = html.indexOf('Bloqueio desligado')
    const pergunta = html.indexOf('Esta vaga é para pessoas com deficiência?')
    assert.ok(titulo >= 0, 'título renderizado')
    assert.ok(tag > titulo, 'tag depois do título')
    assert.ok(pergunta > tag, 'pergunta depois do cabeçalho')
    assert.ok(!html.includes('A vaga é destinada a pessoas com deficiência'))
  })

  test('uma linha de descrição em cada opção', () => {
    const html = criterioPcd(render({ opcaoPcd: 'aberta' }))
    assert.ok(
      opcaoPcdHtml(html, 'aberta').includes(
        'Sem destaque nem restrição para PcD.'
      )
    )
    assert.ok(
      opcaoPcdHtml(html, 'preferencial').includes(
        'Destaca a vaga para PcD. Qualquer pessoa pode se candidatar.'
      )
    )
    assert.ok(
      opcaoPcdHtml(html, 'exclusiva').includes(
        'Só se candidata quem declarou ser PcD no cadastro.'
      )
    )
  })

  test('aberta: sem campo de tipos, sem aviso, bloqueio desligado', () => {
    const html = criterioPcd(render({ opcaoPcd: 'aberta' }))
    assert.ok(!html.includes('Todos os tipos'))
    assert.ok(!html.includes('role="combobox"'))
    assert.ok(!html.includes(AVISO_EXCLUSIVA))
    assert.ok(html.includes('Bloqueio desligado'))
  })

  test('preferencial sem tipo: campo e lista abaixo da opção, nada marcado', () => {
    const html = criterioPcd(render({ opcaoPcd: 'preferencial' }))
    const preferencial = opcaoPcdHtml(html, 'preferencial')
    assert.ok(preferencial.includes('data-tipos-pcd="preferencial"'))
    assert.ok(preferencial.includes('>Tipos de deficiência<'))
    assert.ok(campoTipos(preferencial).includes('Selecione os tipos'))
    assert.match(campoTipos(preferencial), /aria-expanded="true"/)
    for (const label of ['Todos os tipos', 'Auditiva', 'Visual']) {
      assert.ok(preferencial.includes(label), label)
    }
    const tiposArea = preferencial.slice(preferencial.indexOf('data-tipos-pcd'))
    assert.ok(!/data-state="checked"/.test(tiposArea))
    assert.ok(preferencial.includes('Os tipos aparecem como destaque na vaga.'))
    assert.ok(!opcaoPcdHtml(html, 'exclusiva').includes('data-tipos-pcd'))
    assert.ok(!html.includes(AVISO_EXCLUSIVA))
    assert.ok(html.includes('Bloqueio desligado'))
  })

  test('exclusiva: bloqueio ativo, aviso curto, sem alerta nem botão', () => {
    const html = criterioPcd(render({ opcaoPcd: 'exclusiva' }))
    assert.ok(html.includes('Bloqueio ativo'))
    assert.ok(!html.includes('Bloqueio desligado'))
    assert.ok(!html.includes('Bloqueio ainda não ativado'))
    assert.ok(!html.includes('Ativar bloqueio'))
    const exclusiva = opcaoPcdHtml(html, 'exclusiva')
    assert.ok(exclusiva.includes(AVISO_EXCLUSIVA))
    assert.ok(exclusiva.includes('>Tipos de deficiência aceitos<'))
    assert.ok(exclusiva.includes('Marque &quot;Todos os tipos&quot;'))
    assert.ok(!opcaoPcdHtml(html, 'preferencial').includes('data-tipos-pcd'))
  })

  test('exclusiva sem tipo: lista à mostra, sem borda vermelha nem erro', () => {
    const html = criterioPcd(render({ opcaoPcd: 'exclusiva' }))
    assert.ok(html.includes('Todos os tipos'))
    assert.ok(!html.includes('Selecione ao menos um tipo de deficiência.'))
    // classe de erro aplicada (não as variantes aria-invalid:/focus: do shadcn)
    assert.ok(!/[\s"]border-destructive[\s"]/.test(html))
  })

  test('exclusiva sem tipo ao salvar: erro do formulário no campo', () => {
    const html = criterioPcd(
      render({
        opcaoPcd: 'exclusiva',
        erroTiposPcd: 'Selecione ao menos um tipo de deficiência.',
      })
    )
    assert.match(campoTipos(html), /aria-invalid="true"/)
    assert.match(campoTipos(html), /[\s"]border-destructive[\s"]/)
    assert.match(
      html,
      /role="alert"[^>]*>Selecione ao menos um tipo de deficiência\.</
    )
  })

  test('com tipos marcados: campo compacto com chips, lista fechada', () => {
    const html = criterioPcd(
      render({ opcaoPcd: 'preferencial', tipos: ['tipo-visual'] })
    )
    const campo = campoTipos(html)
    assert.match(campo, /aria-expanded="false"/)
    assert.ok(campo.includes('>Visual</span>'))
    assert.ok(!campo.includes('Selecione os tipos'))
    assert.ok(!html.includes('id="tipo-pcd-todos"'))
    assert.ok(!html.includes('Auditiva'))
  })

  test('todos os tipos marcados: chip único "Todos os tipos"', () => {
    const campo = campoTipos(
      criterioPcd(
        render({
          opcaoPcd: 'exclusiva',
          tipos: ['tipo-auditiva', 'tipo-visual'],
        })
      )
    )
    assert.ok(campo.includes('>Todos os tipos</span>'))
    assert.ok(!campo.includes('Auditiva'))
  })

  test('"Todos os tipos" marcado só com todos os tipos marcados', () => {
    // sem nada marcado a lista abre: "Todos os tipos" desmarcado
    assert.match(
      checkboxTodos(criterioPcd(render({ opcaoPcd: 'preferencial' }))),
      /data-state="unchecked"/
    )
  })

  test('carregando os tipos: campo desabilitado com o aviso', () => {
    const html = criterioPcd(
      render({ opcaoPcd: 'preferencial', loadingTiposPcd: true })
    )
    assert.match(campoTipos(html), /disabled=""/)
    assert.ok(html.includes('Carregando tipos de deficiência...'))
    assert.ok(!html.includes('id="tipo-pcd-todos"'))
  })

  test('somente leitura: campo de tipos desabilitado', () => {
    const html = criterioPcd(
      render({ opcaoPcd: 'exclusiva', tipos: ['tipo-visual'], disabled: true })
    )
    assert.match(campoTipos(html), /disabled=""/)
  })
})

describe('bloqueio PcD nos fluxos que gravam a vaga (DEV-422)', () => {
  for (const caminho of FLUXOS_QUE_GRAVAM_A_VAGA) {
    test(`${caminho.split('/').slice(-2).join('/')}: bloqueio vem da opção`, () => {
      const fonte = readFileSync(new URL(caminho, import.meta.url), 'utf8')
      assert.match(fonte, /isBloqueioPcdAtivo\([^,()]*(\([^()]*\))?\)/)
      assert.ok(!fonte.includes('getBloqueioPcdDaVaga'))
      assert.ok(!fonte.includes('bloqueio_pcd'))
    })
  }

  test('formulário sem o campo bloqueio_pcd', () => {
    const fonte = readFileSync(FORM_URL, 'utf8')
    assert.ok(!fonte.includes('bloqueio_pcd'))
    assert.ok(!fonte.includes('onBloqueioPcdChange'))
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
