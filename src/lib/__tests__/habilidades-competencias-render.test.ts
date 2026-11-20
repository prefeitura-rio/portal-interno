import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-684 (PREF-663): o bloco "Habilidades e competências" nos estados do
// Figma (vazio, área recém-adicionada, várias áreas, muitos itens, erros ao
// publicar), em somente leitura, carregando e com erro de lista. Os catálogos
// vêm do cache do TanStack Query, semeado como se o BFF já tivesse respondido.

const COMPONENTE_URL = new URL(
  '../../app/(private)/(app)/gorio/empregabilidade/components/habilidades-competencias-form.tsx',
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { QueryClient, QueryClientProvider } = await import(
  '@tanstack/react-query'
)
const { HabilidadesCompetenciasForm } = await import(COMPONENTE_URL.href)
const { vagaHabilidadesKeys } = await import(
  '../../hooks/use-vaga-habilidades-catalogos.ts'
)

const TI = 3
const ADM = 5
const SEM_CONHECIMENTOS = 8

const AREAS = [
  { id: TI, nome: 'Tecnologia da informação' },
  { id: ADM, nome: 'Administração' },
  { id: SEM_CONHECIMENTOS, nome: 'Saúde' },
]
const CONHECIMENTOS_TI = [
  'Redes de computadores',
  'Suporte técnico',
  'Linux',
  'Python',
  'SQL',
  'Segurança da informação',
  'Pacote Office',
  'Cloud',
  'Banco de dados',
  'Docker',
  'Git',
  'Kubernetes',
].map((nome, i) => ({ id: 100 + i, nome }))
const CONHECIMENTOS: Record<number, { id: number; nome: string }[]> = {
  [TI]: CONHECIMENTOS_TI,
  [ADM]: [
    { id: 200, nome: 'Rotinas administrativas' },
    { id: 201, nome: 'Atendimento ao público' },
  ],
  [SEM_CONHECIMENTOS]: [],
}
const COMPORTAMENTOS = [
  { id: 1, nome: 'Trabalho em equipe' },
  { id: 2, nome: 'Proatividade' },
]

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
  areas?: { id_area_atuacao: number | null; conhecimento_ids: number[] }[]
  comportamentoIds?: number[]
  isReadOnly?: boolean
  erroAreasAtuacao?: string
  erroComportamentos?: string
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
      createElement(HabilidadesCompetenciasForm, {
        areasAtuacao: props.areas ?? [],
        onAreasAtuacaoChange: noop,
        comportamentoAtitudesIds: props.comportamentoIds ?? [],
        onComportamentoAtitudesChange: noop,
        isReadOnly: props.isReadOnly,
        erroAreasAtuacao: props.erroAreasAtuacao,
        erroComportamentos: props.erroComportamentos,
      })
    )
  )
}

function trecho(html: string, marcador: string, fim: string): string {
  const inicio = html.indexOf(marcador)
  assert.ok(inicio >= 0, `${marcador} renderizado`)
  return html.slice(inicio, html.indexOf(fim, inicio))
}

function grupo(html: string, indice: number): string {
  return trecho(html, `data-grupo-area="${indice}"`, '</fieldset>')
}

function secaoComportamentos(html: string): string {
  return trecho(html, 'data-secao-habilidades="comportamentos"', '</section>')
}

/** A tag `<button ...>` que contém o texto (ou o rótulo) informado. */
function botao(html: string, texto: string): string {
  const posicao = html.indexOf(texto)
  assert.ok(posicao >= 0, `"${texto}" renderizado`)
  const inicio = html.lastIndexOf('<button', posicao)
  return html.slice(inicio, html.indexOf('>', inicio) + 1)
}

function badges(html: string): string[] {
  return [...html.matchAll(/<span class="truncate">([^<]+)<\/span>/g)].map(
    m => m[1]
  )
}

function contar(html: string, texto: string): number {
  return html.split(texto).length - 1
}

describe('estado vazio (vaga nova)', () => {
  const html = render()

  test('título, descrição do Figma e as duas seções com ícone e *', () => {
    assert.match(html, /Habilidades e competências/)
    assert.match(
      html,
      /O cidadão não tem acesso a estas informações\. Estas informações ajudam no rankeamento de candidatos\./
    )
    assert.match(html, /Áreas de atuação e conhecimentos/)
    assert.match(
      html,
      /Adicione uma ou mais áreas\. Em cada área, marque só os conhecimentos dela\./
    )
    assert.match(html, /Comportamentos e atitudes/)
    assert.match(
      html,
      /Postura esperada no trabalho\. Vale para qualquer área\./
    )
    assert.equal(contar(html, 'lucide-target'), 1)
    assert.equal(contar(html, 'lucide-heart-handshake'), 1)
    assert.equal(contar(html, 'text-destructive">*</span>'), 2)
  })

  test('sem grupo; o botão "Adicionar área de atuação" está habilitado', () => {
    assert.equal(contar(html, 'data-grupo-area='), 0)
    const adicionar = botao(html, 'Adicionar área de atuação')
    assert.doesNotMatch(adicionar, / disabled=""/)
    assert.doesNotMatch(html, /Adicionar outra área/)
  })

  test('comportamentos com o placeholder do Figma', () => {
    assert.match(
      secaoComportamentos(html),
      /Buscar e adicionar comportamentos e atitudes/
    )
  })
})

describe('área recém-adicionada (nada selecionado)', () => {
  const html = render({
    areas: [{ id_area_atuacao: null, conhecimento_ids: [] }],
  })
  const g = grupo(html, 0)

  test('grupo "Área 1" com a área por escolher e conhecimentos bloqueados', () => {
    assert.match(g, /Área 1/)
    assert.match(g, /Selecione a área de atuação/)
    assert.match(g, /Escolha uma área de atuação primeiro/)
    assert.match(g, /data-desabilitado="true"/)
  })

  test('sem lixeira no único grupo vazio', () => {
    assert.doesNotMatch(g, /Remover área/)
  })

  test('"Adicionar outra área de atuação" desabilitado', () => {
    assert.match(botao(html, 'Adicionar outra área de atuação'), / disabled=""/)
  })
})

describe('preenchido com várias áreas', () => {
  const html = render({
    areas: [
      { id_area_atuacao: TI, conhecimento_ids: [100, 101, 102] },
      { id_area_atuacao: ADM, conhecimento_ids: [201, 200] },
    ],
    comportamentoIds: [2, 1],
  })

  test('cada grupo mostra a área e os seus conhecimentos com contagem', () => {
    const g1 = grupo(html, 0)
    const g2 = grupo(html, 1)
    assert.match(g1, /Área 1/)
    assert.match(g1, /Tecnologia da informação/)
    assert.match(g1, /Conhecimentos \(3\)/)
    assert.deepEqual(badges(g1).slice(1), [
      'Linux',
      'Redes de computadores',
      'Suporte técnico',
    ])
    assert.match(g2, /Área 2/)
    assert.match(g2, /Administração/)
    assert.match(g2, /Conhecimentos \(2\)/)
    assert.deepEqual(badges(g2).slice(1), [
      'Atendimento ao público',
      'Rotinas administrativas',
    ])
  })

  test('badges removíveis e lixeira em cada grupo', () => {
    assert.match(html, /aria-label="Remover Linux"/)
    assert.match(html, /aria-label="Remover Proatividade"/)
    assert.match(grupo(html, 0), /aria-label="Remover área 1"/)
    assert.match(grupo(html, 1), /aria-label="Remover área 2"/)
  })

  test('comportamentos com contagem e em ordem A–Z', () => {
    const secao = secaoComportamentos(html)
    assert.match(secao, /Comportamentos e atitudes \(2\)/)
    assert.deepEqual(badges(secao), ['Proatividade', 'Trabalho em equipe'])
  })

  test('com o último grupo completo, "Adicionar outra área" habilita', () => {
    assert.doesNotMatch(
      botao(html, 'Adicionar outra área de atuação'),
      / disabled=""/
    )
  })
})

describe('muitos itens', () => {
  const html = render({
    areas: [
      {
        id_area_atuacao: TI,
        conhecimento_ids: CONHECIMENTOS_TI.map(item => item.id),
      },
    ],
  })
  const g = grupo(html, 0)

  test('mostra 9 badges e "+3 mais"', () => {
    assert.match(g, /Conhecimentos \(12\)/)
    assert.equal(contar(g, 'aria-label="Remover '), 9 + 1)
    assert.match(g, /\+3 mais/)
  })
})

describe('erros ao publicar (por área e por campo)', () => {
  const html = render({
    areas: [
      { id_area_atuacao: TI, conhecimento_ids: [100] },
      { id_area_atuacao: ADM, conhecimento_ids: [] },
      { id_area_atuacao: null, conhecimento_ids: [] },
    ],
    erroAreasAtuacao: 'Selecione ao menos um conhecimento desta área',
    erroComportamentos: 'Selecione ao menos um comportamento ou atitude',
  })

  test('cada grupo mostra o seu erro no campo', () => {
    assert.doesNotMatch(grupo(html, 0), /role="alert"/)
    assert.match(
      grupo(html, 1),
      /role="alert"[^>]*>Selecione ao menos um conhecimento desta área</
    )
    assert.match(
      grupo(html, 2),
      /role="alert"[^>]*>Selecione a área de atuação</
    )
    assert.match(grupo(html, 1), /aria-invalid="true"/)
    assert.match(grupo(html, 2), /border-destructive/)
  })

  test('comportamentos sem nenhum marcado mostram o erro', () => {
    assert.match(
      secaoComportamentos(html),
      /role="alert"[^>]*>Selecione ao menos um comportamento ou atitude</
    )
  })

  test('sem o erro da publicação, nenhum erro aparece', () => {
    const semErro = render({
      areas: [{ id_area_atuacao: ADM, conhecimento_ids: [] }],
    })
    assert.doesNotMatch(semErro, /role="alert"/)
  })

  test('o erro some do campo assim que ele é corrigido', () => {
    const corrigido = render({
      areas: [{ id_area_atuacao: ADM, conhecimento_ids: [200] }],
      comportamentoIds: [1],
      erroAreasAtuacao: 'Selecione ao menos um conhecimento desta área',
      erroComportamentos: 'Selecione ao menos um comportamento ou atitude',
    })
    assert.doesNotMatch(corrigido, /role="alert"/)
  })
})

describe('somente leitura', () => {
  const html = render({
    areas: [{ id_area_atuacao: TI, conhecimento_ids: [100, 101] }],
    comportamentoIds: [1],
    isReadOnly: true,
  })

  test('mostra o que está marcado, sem × e sem lixeira', () => {
    assert.match(html, /data-somente-leitura="true"/)
    assert.deepEqual(badges(grupo(html, 0)).slice(1), [
      'Redes de computadores',
      'Suporte técnico',
    ])
    assert.doesNotMatch(html, /aria-label="Remover/)
  })

  test('todos os campos e o botão de adicionar desabilitados', () => {
    // Área, conhecimentos e comportamentos.
    assert.equal(contar(html, 'role="combobox"'), 3)
    for (const tag of html.match(/<button[^>]*role="combobox"[^>]*>/g) ?? []) {
      assert.match(tag, / disabled=""/)
    }
    assert.match(botao(html, 'Adicionar outra área de atuação'), / disabled=""/)
  })
})

describe('carregando e erro de lista', () => {
  test('carregando as listas', () => {
    const html = render(
      { areas: [{ id_area_atuacao: TI, conhecimento_ids: [] }] },
      {
        areas: 'carregando',
        comportamentos: 'carregando',
        conhecimentos: 'carregando',
      }
    )
    assert.match(html, /Carregando conhecimentos\.\.\./)
    assert.match(html, /Carregando comportamentos\.\.\./)
    assert.match(html, /aria-busy="true"/)
    const vazio = render(
      { areas: [{ id_area_atuacao: null, conhecimento_ids: [] }] },
      { areas: 'carregando' }
    )
    assert.match(vazio, /Carregando áreas\.\.\./)
  })

  test('erro de lista com "Tentar novamente" e o campo bloqueado', () => {
    const html = render(
      { areas: [{ id_area_atuacao: TI, conhecimento_ids: [] }] },
      { areas: 'erro', comportamentos: 'erro', conhecimentos: 'erro' }
    )
    assert.match(html, /Não foi possível carregar as áreas de atuação\./)
    assert.match(
      html,
      /Não foi possível carregar os conhecimentos desta área\./
    )
    assert.match(
      html,
      /Não foi possível carregar os comportamentos e atitudes\./
    )
    assert.equal(contar(html, 'Tentar novamente'), 3)
    for (const tag of html.match(/<button[^>]*role="combobox"[^>]*>/g) ?? []) {
      assert.match(tag, / disabled=""/)
    }
  })

  test('área sem conhecimentos cadastrados avisa e bloqueia o campo', () => {
    const html = render({
      areas: [{ id_area_atuacao: SEM_CONHECIMENTOS, conhecimento_ids: [] }],
    })
    assert.match(
      grupo(html, 0),
      /Esta área ainda não tem conhecimentos cadastrados\./
    )
    assert.match(grupo(html, 0), /data-desabilitado="true"/)
  })
})
