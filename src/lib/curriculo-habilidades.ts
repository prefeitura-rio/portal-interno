/**
 * Seção "Habilidades e competências" do currículo do candidato, lida do
 * `curriculo_snapshot` da candidatura (app-go-api: `area_atuacao`,
 * `conhecimentos` e `comportamentos_atitudes`, itens de catálogo `{id, nome}`).
 *
 * Currículos antigos não têm esses campos, ou os têm `null`/`[]`: tudo isso é
 * tratado como "sem dados", sem quebrar a gaveta.
 */

/** Quantos chips cada grupo mostra antes do botão "Ver todos". */
export const HABILIDADES_CHIPS_LIMIT = 9

export interface CatalogoItemSnapshot {
  id?: number | null
  nome?: string | null
}

export interface HabilidadesSnapshot {
  area_atuacao?: CatalogoItemSnapshot | null
  conhecimentos?: Array<CatalogoItemSnapshot | null> | null
  comportamentos_atitudes?: Array<CatalogoItemSnapshot | null> | null
}

export interface HabilidadeChip {
  key: string
  nome: string
}

export interface HabilidadesCompetencias {
  areaAtuacao: string | null
  conhecimentos: HabilidadeChip[]
  comportamentos: HabilidadeChip[]
}

export interface VisibleChips {
  visible: HabilidadeChip[]
  /** Quantos chips ficam fora da lista recolhida (o N de "Ver todos (+N)"). */
  hiddenCount: number
}

/**
 * Extrai a seção do snapshot. Devolve `null` (seção oculta) quando área,
 * conhecimentos e comportamentos estão todos ausentes, nulos ou vazios.
 * Os chips mantêm a ordem recebida da API.
 */
export function extractHabilidadesCompetencias(
  snapshot: HabilidadesSnapshot | null | undefined
): HabilidadesCompetencias | null {
  if (!snapshot || typeof snapshot !== 'object') return null

  const areaAtuacao = catalogoItemNome(snapshot.area_atuacao)
  const conhecimentos = toChips(snapshot.conhecimentos, 'conhecimento')
  const comportamentos = toChips(
    snapshot.comportamentos_atitudes,
    'comportamento'
  )

  if (!areaAtuacao && conhecimentos.length === 0 && comportamentos.length === 0)
    return null

  return { areaAtuacao, conhecimentos, comportamentos }
}

/** Chips exibidos de um grupo: até `limit` recolhido, todos quando expandido. */
export function getVisibleChips(
  chips: HabilidadeChip[],
  expanded: boolean,
  limit: number = HABILIDADES_CHIPS_LIMIT
): VisibleChips {
  const hiddenCount = Math.max(chips.length - limit, 0)
  if (expanded || hiddenCount === 0) return { visible: chips, hiddenCount }
  return { visible: chips.slice(0, limit), hiddenCount }
}

/** Rótulo do botão que expande ou recolhe um grupo; `null` quando não há botão. */
export function getToggleChipsLabel(
  hiddenCount: number,
  expanded: boolean
): string | null {
  if (hiddenCount <= 0) return null
  return expanded ? 'Ver menos' : `Ver todos (+${hiddenCount})`
}

function catalogoItemNome(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const nome = (item as CatalogoItemSnapshot).nome
  if (typeof nome !== 'string') return null
  const trimmed = nome.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toChips(items: unknown, prefix: string): HabilidadeChip[] {
  if (!Array.isArray(items)) return []
  const chips: HabilidadeChip[] = []
  items.forEach((item, index) => {
    const nome = catalogoItemNome(item)
    if (!nome) return
    const id = (item as CatalogoItemSnapshot).id
    chips.push({ key: `${prefix}-${id ?? 'sem-id'}-${index}`, nome })
  })
  return chips
}
