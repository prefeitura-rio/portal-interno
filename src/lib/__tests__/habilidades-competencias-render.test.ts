import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-526: o bloco "Habilidades e competências" renderiza os grupos de área,
// a seção de comportamentos/atitudes e os estados de carregando, erro de
// lista, área sem conhecimentos e somente leitura. Os catálogos vêm do cache
// do TanStack Query, semeado como se o BFF já tivesse respondido.

const COMPONENTE_URL = new URL(
  '../../app/(private)/(app)/gorio/empregabilidade/components/habilidades-competencias.tsx',
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { QueryClient, QueryClientProvider } = await import(
  '@tanstack/react-query'
)
const { HabilidadesCompetencias } = await import(COMPONENTE_URL.href)
const { vagaHabilidadesKeys } = await import(
  '../../hooks/use-vaga-habilidades-catalogos.ts'
)

const TI = 3
const ADM = 5

const AREAS = [
  { id: TI, nome: 'Tecnologia da Informação' },
  { id: ADM, nome: 'Administração' },
  { id: 8, nome: 'Saúde' },
]
const CONHECIMENTOS: Record<number, { id: number; nome: string }[]> = {
  [TI]: [
    { id: 10, nome: 'SQL' },
    { id: 11, nome: 'Java' },
    { id: 12, nome: 'Docker' },
  ],
  [ADM]: [{ id: 20, nome: 'Planilhas' }],
  8: [],
}
const COMPORTAMENTOS = [
  'Trabalho em equipe',
  'Proatividade',
  'Ética',
  'Empatia',
  'Comunicação',
  'Organização',
  'Liderança',
  'Pontualidade',
  'Resiliência',
  'Adaptabilidade',
  'Criatividade',
  'Foco no cliente',
].map((nome, i) => ({ id: i + 1, nome }))

function pagina(data: { id: number; nome: string }[]) {
  return { data, meta: { page: 1, page_size: data.length, total: data.length } }
}

type Estado = 'ok' | 'carregando' | 'erro'

function criarClient({
  areas = 'ok',
  comportamentos = 'ok',
  conhecimentos = 'ok',
}: {
  areas?: Estado
  comportamentos?: Estado
  conhecimentos?: Estado
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  })
  const semear = (key: readonly unknown[], estado: Estado, data: unknown) => {
    if (estado === 'ok') {
      client.setQueryData(key, data)
    } else if (estado === 'erro') {
      client
        .getQueryCache()
        .build(client, { queryKey: key })
        .setState({
          status: 'error',
          error: new Error('falha sintética'),
          fetchStatus: 'idle',
          errorUpdatedAt: Date.now(),
        })
    }
  }
  semear(vagaHabilidadesKeys.areasAtuacaoCompleto(), areas, pagina(AREAS))
  semear(
    vagaHabilidadesKeys.comportamentosAtitudesCompleto(),
    comportamentos,
    pagina(COMPORTAMENTOS)
  )
  for (const [id, itens] of Object.entries(CONHECIMENTOS)) {
    semear(
      vagaHabilidadesKeys.conhecimentosCompleto(Number(id)),
      conhecimentos,
      pagina(itens)
    )
  }
  return client
}

interface Props {
  areas?: { id_area_atuacao: number; conhecimento_ids: number[] }[]
  comportamentoIds?: number[]
  isReadOnly?: boolean
  erros?: Record<string, unknown>
}

function render(
  props: Props = {},
  estados: Parameters<typeof criarClient>[0] = {}
) {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: criarClient(estados) },
      createElement(HabilidadesCompetencias, {
        areas: props.areas ?? [],
        onAreasChange: noop,
        comportamentoIds: props.comportamentoIds ?? [],
        onComportamentosChange: noop,
        isReadOnly: props.isReadOnly,
        erros: props.erros,
      })
    )
  )
}

function grupo(html: string, indice: number): string {
  const inicio = html.indexOf(`data-grupo-area="${indice}"`)
  assert.ok(inicio >= 0, `grupo ${indice} renderizado`)
  const fim = html.indexOf('</fieldset>', inicio)
  return html.slice(inicio, fim)
}

function secaoComportamentos(html: string): string {
  const inicio = html.indexOf('data-secao-comportamentos')
  assert.ok(inicio >= 0, 'seção de comportamentos renderizada')
  return html.slice(inicio)
}

function botao(html: string, texto: string): string {
  const fim = html.indexOf(texto)
  assert.ok(fim >= 0, `botão ${texto}`)
  return html.slice(html.lastIndexOf('<button', fim), fim)
}

function badges(trecho: string): string[] {
  return [...trecho.matchAll(/aria-label="Remover ([^"]+)"/g)]
    .map(m => m[1])
    .filter(nome => nome !== 'área')
}

const DUAS_AREAS = [
  { id_area_atuacao: TI, conhecimento_ids: [10, 11, 12] },
  { id_area_atuacao: ADM, conhecimento_ids: [20] },
]

describe('bloco Habilidades e competências', () => {
  test('título, grupo de área e seção de comportamentos fora dos grupos', () => {
    const html = render({ areas: DUAS_AREAS })
    assert.ok(html.includes('Habilidades e competências'))
    assert.ok(grupo(html, 0).includes('Área de atuação'))
    assert.ok(grupo(html, 0).includes('Conhecimentos'))
    assert.ok(grupo(html, 1))
    assert.ok(!html.includes('data-grupo-area="2"'))
    const comportamentos = secaoComportamentos(html)
    assert.ok(comportamentos.includes('Comportamentos e atitudes'))
    assert.ok(!comportamentos.includes('data-grupo-area'))
  })

  test('sem área: um grupo vazio, conhecimentos esperando a área', () => {
    const html = render()
    const vazio = grupo(html, 0)
    assert.ok(vazio.includes('Selecione a área'))
    assert.ok(vazio.includes('Selecione a área primeiro'))
    assert.match(botao(vazio, 'Selecione a área primeiro'), /disabled=""/)
    assert.match(
      vazio.match(/<button[^>]*aria-label="Remover área"[^>]*>/)?.[0] ?? '',
      /disabled=""/,
      'nada para remover'
    )
    assert.match(botao(html, 'Adicionar outra área'), /disabled=""/)
  })

  test('"Adicionar outra área" habilita com o último grupo completo', () => {
    const html = render({ areas: DUAS_AREAS })
    assert.doesNotMatch(botao(html, 'Adicionar outra área'), /disabled=""/)
    const incompleto = render({
      areas: [...DUAS_AREAS, { id_area_atuacao: 8, conhecimento_ids: [] }],
    })
    assert.match(botao(incompleto, 'Adicionar outra área'), /disabled=""/)
  })

  test('lixeira em cada grupo, sem diálogo de confirmação', () => {
    const html = render({ areas: DUAS_AREAS })
    assert.equal(html.match(/aria-label="Remover área"/g)?.length, 2)
    assert.ok(!html.includes('role="alertdialog"'))
    assert.ok(!/Tem certeza/i.test(html))
  })

  test('badges removíveis em ordem A–Z, com "Remover {nome}"', () => {
    const html = render({ areas: DUAS_AREAS, comportamentoIds: [1, 2, 3] })
    assert.deepEqual(badges(grupo(html, 0)), ['Docker', 'Java', 'SQL'])
    assert.deepEqual(badges(grupo(html, 1)), ['Planilhas'])
    assert.deepEqual(badges(secaoComportamentos(html)), [
      'Ética',
      'Proatividade',
      'Trabalho em equipe',
    ])
  })

  test('até 9 badges por campo e "+N mais"', () => {
    const html = render({
      areas: DUAS_AREAS,
      comportamentoIds: COMPORTAMENTOS.map(item => item.id),
    })
    const comportamentos = secaoComportamentos(html)
    assert.deepEqual(badges(comportamentos), [
      'Adaptabilidade',
      'Comunicação',
      'Criatividade',
      'Empatia',
      'Ética',
      'Foco no cliente',
      'Liderança',
      'Organização',
      'Pontualidade',
    ])
    assert.ok(comportamentos.includes('+3 mais'))
    assert.ok(comportamentos.includes('12 selecionados'))
    assert.ok(!grupo(html, 0).includes('mais</span>'))
  })

  test('sem botão "Cadastrar novo"', () => {
    const html = render({ areas: DUAS_AREAS, comportamentoIds: [1] })
    assert.ok(!/Cadastrar/i.test(html))
  })

  test('carregando: áreas, conhecimentos e comportamentos', () => {
    const html = render(
      { areas: [{ id_area_atuacao: TI, conhecimento_ids: [] }] },
      {
        areas: 'carregando',
        comportamentos: 'carregando',
        conhecimentos: 'carregando',
      }
    )
    assert.match(
      grupo(html, 0).match(/<button[^>]*role="combobox"[^>]*>/)?.[0] ?? '',
      /aria-busy="true"[^>]*disabled=""|disabled=""[^>]*aria-busy="true"/,
      'Select de área carregando e desabilitado'
    )
    assert.ok(html.includes('Carregando conhecimentos...'))
    assert.ok(html.includes('Carregando comportamentos...'))
    assert.match(botao(html, 'Carregando comportamentos...'), /disabled=""/)
  })

  test('erro de lista: mensagem no campo e "Tentar novamente"', () => {
    const html = render(
      { areas: [{ id_area_atuacao: TI, conhecimento_ids: [] }] },
      { areas: 'erro', comportamentos: 'erro', conhecimentos: 'erro' }
    )
    for (const mensagem of [
      'Não foi possível carregar as áreas de atuação.',
      'Não foi possível carregar os conhecimentos desta área.',
      'Não foi possível carregar os comportamentos e atitudes.',
    ]) {
      assert.match(html, new RegExp(`role="alert"[^>]*>${mensagem}<`))
    }
    assert.equal(html.match(/Tentar novamente/g)?.length, 3)
  })

  test('área sem conhecimentos: aviso e campo desabilitado', () => {
    const html = render({
      areas: [{ id_area_atuacao: 8, conhecimento_ids: [] }],
    })
    const saude = grupo(html, 0)
    assert.ok(
      saude.includes('Esta área ainda não tem conhecimentos cadastrados.')
    )
    assert.match(botao(saude, 'Selecione os conhecimentos'), /disabled=""/)
  })

  test('somente leitura: mostra as escolhas sem nenhuma ação', () => {
    const html = render({
      areas: DUAS_AREAS,
      comportamentoIds: [1, 2],
      isReadOnly: true,
    })
    assert.ok(html.includes('data-somente-leitura="true"'))
    assert.ok(!html.includes('aria-label="Remover'))
    assert.ok(!html.includes('Adicionar outra área'))
    assert.ok(html.includes('>Java<'))
    assert.ok(html.includes('>Proatividade<'))
    for (const combobox of html.match(/<button[^>]*role="combobox"[^>]*>/g) ??
      []) {
      assert.match(combobox, /disabled=""/)
    }
  })

  test('somente leitura sem área: sem grupo vazio', () => {
    const html = render({ isReadOnly: true })
    assert.ok(!html.includes('data-grupo-area'))
    assert.ok(html.includes('Nenhuma área informada.'))
  })

  test('erros de validação aparecem no campo certo', () => {
    const html = render({
      areas: [{ id_area_atuacao: TI, conhecimento_ids: [] }],
      erros: {
        grupos: [
          { conhecimentos: 'Selecione ao menos um conhecimento desta área.' },
        ],
        comportamentos: 'Selecione ao menos um comportamento ou atitude.',
      },
    })
    assert.match(
      grupo(html, 0),
      /role="alert"[^>]*>Selecione ao menos um conhecimento desta área\.</
    )
    assert.match(
      secaoComportamentos(html),
      /role="alert"[^>]*>Selecione ao menos um comportamento ou atitude\.</
    )
    assert.match(
      botao(
        secaoComportamentos(html),
        'Selecione os comportamentos e atitudes'
      ),
      /aria-invalid="true"/
    )
    const semArea = render({
      erros: { areas: 'Selecione ao menos uma área de atuação.' },
    })
    assert.match(
      semArea,
      /role="alert"[^>]*>Selecione ao menos uma área de atuação\.</
    )
  })

  test('nome acessível dos campos vem do rótulo visível', () => {
    const html = render({ areas: DUAS_AREAS })
    const combos = html.match(/<button[^>]*role="combobox"[^>]*>/g) ?? []
    assert.ok(combos.length >= 5, 'Select de área e multi-selects')
    for (const combo of combos) assert.match(combo, /aria-labelledby="[^"]+"/)
  })
})

describe('código do componente', () => {
  const fonte = readFileSync(COMPONENTE_URL, 'utf8')

  test('só componentes de src/components/ui e tokens do tema', () => {
    const imports = [...fonte.matchAll(/from '(@\/components\/[^']+)'/g)].map(
      m => m[1]
    )
    assert.ok(imports.length > 0)
    for (const caminho of imports) {
      assert.match(caminho, /^@\/components\/ui\//, caminho)
    }
    assert.doesNotMatch(fonte, /#[0-9a-fA-F]{3,8}\b/, 'sem cor fixa')
    assert.doesNotMatch(fonte, /style=\{/, 'sem CSS inline')
    assert.doesNotMatch(
      fonte,
      /\b(?:bg|text|border)-(?:red|blue|green|gray|slate|zinc|amber)-\d/,
      'sem cor da paleta fora dos tokens'
    )
  })
})
