/**
 * Habilidades e competências da vaga de empregabilidade (DEV-525, história
 * PREF-662).
 *
 * O app-go-api (DEV-524) grava na vaga uma lista de áreas de atuação, cada uma
 * com os seus conhecimentos, e os comportamentos/atitudes:
 *
 * - entrada: `areas_atuacao: [{ id_area_atuacao, conhecimento_ids }]` e
 *   `comportamento_atitudes_ids`; os nomes (`nome`, `conhecimentos`,
 *   `comportamentos_atitudes`) são ignorados;
 * - saída: as mesmas listas com os nomes. Só a gestão (GET/POST/PUT da vaga)
 *   as devolve; vaga sem registro vem com `[]`;
 * - no PUT, o campo ausente (ou `null`) mantém o gravado e a lista enviada
 *   substitui o conjunto inteiro (`[]` apaga tudo). Área repetida ou
 *   conhecimento de outra área são recusados com 400.
 *
 * Os catálogos (áreas, conhecimentos de uma área, comportamentos) são lidos
 * pelas rotas GET do BFF em `/api/empregabilidade`, com `q`, `page` e
 * `pageSize` validados aqui.
 */

/** Item de catálogo (área, conhecimento ou comportamento) com o nome. */
export interface CatalogoHabilidadeItem {
  id: number
  nome: string
}

/** Uma área de atuação da vaga, com os conhecimentos marcados nela. */
export interface VagaAreaAtuacaoSelecionada {
  id_area_atuacao: number
  conhecimento_ids: number[]
  /** Só leitura (vem da API); ignorado no envio. */
  nome?: string
  /** Só leitura (vem da API); ignorado no envio. */
  conhecimentos?: CatalogoHabilidadeItem[]
}

/**
 * Valor das habilidades no formulário da vaga. `undefined` em uma lista quer
 * dizer "não lida/não mexida": ela não é enviada e o PUT mantém o gravado.
 */
export interface VagaHabilidades {
  areas_atuacao?: VagaAreaAtuacaoSelecionada[]
  comportamento_atitudes_ids?: number[]
  /** Só leitura (vem da API); ignorado no envio. */
  comportamentos_atitudes?: CatalogoHabilidadeItem[]
}

/** Corpo que a API aceita (só os ids). */
export interface VagaHabilidadesApi {
  areas_atuacao?: { id_area_atuacao: number; conhecimento_ids: number[] }[]
  comportamento_atitudes_ids?: number[]
}

/** Limites da API (DEV-524): acima deles ela responde 400. */
export const MAX_AREAS_ATUACAO = 50
export const MAX_CONHECIMENTOS_POR_AREA = 300
export const MAX_COMPORTAMENTOS = 100

function isIdValido(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Ids positivos, sem repetição, na ordem em que aparecem. */
function idsUnicos(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  const vistos = new Set<number>()
  for (const value of values) {
    if (isIdValido(value)) vistos.add(value)
  }
  return [...vistos]
}

function catalogoItens(values: unknown): CatalogoHabilidadeItem[] {
  if (!Array.isArray(values)) return []
  const itens: CatalogoHabilidadeItem[] = []
  const vistos = new Set<number>()
  for (const value of values) {
    if (typeof value !== 'object' || value === null) continue
    const { id, nome } = value as { id?: unknown; nome?: unknown }
    if (!isIdValido(id) || vistos.has(id)) continue
    vistos.add(id)
    itens.push({ id, nome: typeof nome === 'string' ? nome : '' })
  }
  return itens
}

/**
 * Normaliza as áreas: descarta entrada sem id válido e junta área repetida
 * (a API recusa a repetição) somando os conhecimentos, sem repetir nenhum.
 */
function normalizarAreas(values: unknown): VagaAreaAtuacaoSelecionada[] {
  if (!Array.isArray(values)) return []
  const porArea = new Map<number, VagaAreaAtuacaoSelecionada>()
  for (const value of values) {
    if (typeof value !== 'object' || value === null) continue
    const campos = value as {
      id_area_atuacao?: unknown
      conhecimento_ids?: unknown
      nome?: unknown
      conhecimentos?: unknown
    }
    if (!isIdValido(campos.id_area_atuacao)) continue
    const conhecimentos = catalogoItens(campos.conhecimentos)
    const ids = idsUnicos([
      ...(Array.isArray(campos.conhecimento_ids)
        ? campos.conhecimento_ids
        : []),
      ...conhecimentos.map(item => item.id),
    ])
    const atual = porArea.get(campos.id_area_atuacao)
    if (!atual) {
      const area: VagaAreaAtuacaoSelecionada = {
        id_area_atuacao: campos.id_area_atuacao,
        conhecimento_ids: ids,
      }
      if (typeof campos.nome === 'string') area.nome = campos.nome
      if (conhecimentos.length > 0) area.conhecimentos = conhecimentos
      porArea.set(campos.id_area_atuacao, area)
      continue
    }
    atual.conhecimento_ids = idsUnicos([...atual.conhecimento_ids, ...ids])
    if (conhecimentos.length > 0) {
      atual.conhecimentos = catalogoItens([
        ...(atual.conhecimentos ?? []),
        ...conhecimentos,
      ])
    }
  }
  return [...porArea.values()]
}

/**
 * Habilidades de uma vaga lida da API, para o formulário e para a duplicação.
 * Lista ausente na resposta (API anterior à DEV-524) fica `undefined`, para
 * não ser reenviada como `[]` (o que apagaria o gravado); vaga sem registro
 * vem da API com `[]` e fica `[]`.
 */
export function getVagaHabilidadesDaVaga(vaga: object): VagaHabilidades {
  const campos: {
    areas_atuacao?: unknown
    comportamento_atitudes_ids?: unknown
    comportamentos_atitudes?: unknown
  } = vaga
  const habilidades: VagaHabilidades = {}
  if (Array.isArray(campos.areas_atuacao)) {
    habilidades.areas_atuacao = normalizarAreas(campos.areas_atuacao)
  }
  const comportamentos = catalogoItens(campos.comportamentos_atitudes)
  if (
    Array.isArray(campos.comportamento_atitudes_ids) ||
    Array.isArray(campos.comportamentos_atitudes)
  ) {
    habilidades.comportamento_atitudes_ids = idsUnicos([
      ...(Array.isArray(campos.comportamento_atitudes_ids)
        ? campos.comportamento_atitudes_ids
        : []),
      ...comportamentos.map(item => item.id),
    ])
  }
  if (comportamentos.length > 0) {
    habilidades.comportamentos_atitudes = comportamentos
  }
  return habilidades
}

/**
 * Campos de habilidades no corpo da vaga (criar, rascunho, duplicar, editar):
 * só os ids, área repetida juntada, e a lista `undefined` fica de fora para o
 * PUT manter o que está gravado.
 */
export function getVagaHabilidadesParaApi(
  habilidades: VagaHabilidades | null | undefined
): VagaHabilidadesApi {
  const corpo: VagaHabilidadesApi = {}
  if (!habilidades) return corpo
  if (Array.isArray(habilidades.areas_atuacao)) {
    corpo.areas_atuacao = normalizarAreas(habilidades.areas_atuacao).map(
      area => ({
        id_area_atuacao: area.id_area_atuacao,
        conhecimento_ids: area.conhecimento_ids,
      })
    )
  }
  if (Array.isArray(habilidades.comportamento_atitudes_ids)) {
    corpo.comportamento_atitudes_ids = idsUnicos(
      habilidades.comportamento_atitudes_ids
    )
  }
  return corpo
}

// ============================================
// Parâmetros das rotas GET de catálogo do BFF
// ============================================

export const CATALOGO_PAGE_PADRAO = 1
export const CATALOGO_PAGE_SIZE_PADRAO = 20
/** Máximo que a API aceita em `pageSize`. */
export const CATALOGO_PAGE_SIZE_MAX = 100
export const CATALOGO_BUSCA_MAX = 100

export interface CatalogoListParams {
  q?: string
  page: number
  pageSize: number
}

export type CatalogoParamsResult =
  | { ok: true; params: CatalogoListParams }
  | { ok: false; error: string }

function parseInteiroPositivo(
  raw: string | null,
  padrao: number
): number | null {
  if (raw === null || raw.trim() === '') return padrao
  if (!/^\d+$/.test(raw.trim())) return null
  const value = Number(raw.trim())
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/**
 * `q`, `page` e `pageSize` de uma rota GET de catálogo. `q` vazio é ignorado;
 * `page` e `pageSize` são inteiros positivos (`pageSize` até 100, o limite da
 * API). Valor inválido devolve o erro para a rota responder 400.
 */
export function parseCatalogoListParams(
  searchParams: URLSearchParams
): CatalogoParamsResult {
  const page = parseInteiroPositivo(
    searchParams.get('page'),
    CATALOGO_PAGE_PADRAO
  )
  if (page === null) {
    return { ok: false, error: 'page deve ser um inteiro maior que zero' }
  }
  const pageSize = parseInteiroPositivo(
    searchParams.get('pageSize'),
    CATALOGO_PAGE_SIZE_PADRAO
  )
  if (pageSize === null || pageSize > CATALOGO_PAGE_SIZE_MAX) {
    return {
      ok: false,
      error: `pageSize deve ser um inteiro entre 1 e ${CATALOGO_PAGE_SIZE_MAX}`,
    }
  }
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length > CATALOGO_BUSCA_MAX) {
    return {
      ok: false,
      error: `q deve ter no máximo ${CATALOGO_BUSCA_MAX} caracteres`,
    }
  }
  return {
    ok: true,
    params: q === '' ? { page, pageSize } : { q, page, pageSize },
  }
}

/** Id da área de atuação no caminho: inteiro positivo, senão `null`. */
export function parseAreaAtuacaoId(raw: string): number | null {
  const texto = raw.trim()
  if (!/^\d+$/.test(texto)) return null
  const value = Number(texto)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/** Página de catálogo devolvida pelo BFF. */
export interface CatalogoHabilidadesPage {
  data: CatalogoHabilidadeItem[]
  meta: { page: number; page_size: number; total: number }
}

/**
 * Normaliza a resposta paginada da API (`data`, `page`, `pageSize`, `total`)
 * no formato das rotas de catálogo do BFF (`data` e `meta`).
 */
export function toCatalogoHabilidadesPage(
  resposta: unknown,
  params: CatalogoListParams
): CatalogoHabilidadesPage {
  const campos =
    typeof resposta === 'object' && resposta !== null
      ? (resposta as {
          data?: unknown
          page?: unknown
          pageSize?: unknown
          total?: unknown
        })
      : {}
  const data = catalogoItens(campos.data)
  const inteiro = (value: unknown, padrao: number) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : padrao
  return {
    data,
    meta: {
      page: inteiro(campos.page, params.page),
      page_size: inteiro(campos.pageSize, params.pageSize),
      total: inteiro(campos.total, data.length),
    },
  }
}
