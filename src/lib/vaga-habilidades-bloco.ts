/**
 * Regras do bloco "Habilidades e competências" do formulário da vaga
 * (DEV-684, PREF-663): grupos de área (uma área de atuação com os seus
 * conhecimentos) e a seção de comportamentos/atitudes. O cidadão não vê esses
 * dados.
 *
 * Funções puras (sem React), usadas pelo componente
 * `habilidades-competencias-form.tsx`, pela validação do formulário e pelos
 * testes.
 */

import {
  type CatalogoHabilidadeItem,
  MAX_AREAS_ATUACAO,
  type VagaAreaAtuacaoSelecionada,
} from './vaga-habilidades'

// ============================================
// Textos do bloco (Figma da PREF-660)
// ============================================

export const HABILIDADES_TITULO = 'Habilidades e competências'
export const HABILIDADES_DESCRICAO =
  'O cidadão não tem acesso a estas informações. Estas informações ajudam no rankeamento de candidatos.'

export const AREAS_SECAO_TITULO = 'Áreas de atuação e conhecimentos'
export const AREAS_SECAO_DESCRICAO =
  'Adicione uma ou mais áreas. Em cada área, marque só os conhecimentos dela.'
export const AREA_LABEL = 'Área de atuação'
export const AREA_PLACEHOLDER = 'Selecione a área de atuação'
export const AREA_BUSCA_PLACEHOLDER = 'Buscar área de atuação'
export const AREA_JA_ADICIONADA = 'Já adicionada'
export const CONHECIMENTOS_LABEL = 'Conhecimentos'
export const CONHECIMENTOS_PLACEHOLDER = 'Buscar e adicionar conhecimentos'
export const CONHECIMENTOS_BUSCA_PLACEHOLDER = 'Buscar conhecimento'
export const CONHECIMENTOS_SEM_AREA = 'Escolha uma área de atuação primeiro'
export const COMPORTAMENTOS_LABEL = 'Comportamentos e atitudes'
export const COMPORTAMENTOS_DESCRICAO =
  'Postura esperada no trabalho. Vale para qualquer área.'
export const COMPORTAMENTOS_PLACEHOLDER =
  'Buscar e adicionar comportamentos e atitudes'
export const COMPORTAMENTOS_BUSCA_PLACEHOLDER =
  'Buscar comportamento ou atitude'
export const ADICIONAR_PRIMEIRA_AREA_LABEL = 'Adicionar área de atuação'
export const ADICIONAR_OUTRA_AREA_LABEL = 'Adicionar outra área de atuação'
export const REMOVER_AREA_LABEL = 'Remover área'
export const NENHUM_RESULTADO = 'Nenhum resultado encontrado.'
export const TENTAR_NOVAMENTE_LABEL = 'Tentar novamente'

export const CARREGANDO_AREAS = 'Carregando áreas...'
export const CARREGANDO_CONHECIMENTOS = 'Carregando conhecimentos...'
export const CARREGANDO_COMPORTAMENTOS = 'Carregando comportamentos...'

export const ERRO_LISTA_AREAS = 'Não foi possível carregar as áreas de atuação.'
export const ERRO_LISTA_CONHECIMENTOS =
  'Não foi possível carregar os conhecimentos desta área.'
export const ERRO_LISTA_COMPORTAMENTOS =
  'Não foi possível carregar os comportamentos e atitudes.'
export const AREA_SEM_CONHECIMENTOS =
  'Esta área ainda não tem conhecimentos cadastrados.'

/** Mensagens de validação ao publicar ou enviar para aprovação. */
export const ERRO_AREA_OBRIGATORIA = 'Adicione ao menos uma área de atuação'
export const ERRO_AREA_DO_GRUPO = 'Selecione a área de atuação'
export const ERRO_AREA_REPETIDA = 'Esta área já foi adicionada em outro grupo'
export const ERRO_CONHECIMENTO_OBRIGATORIO =
  'Selecione ao menos um conhecimento desta área'
export const ERRO_COMPORTAMENTO_OBRIGATORIO =
  'Selecione ao menos um comportamento ou atitude'

/** Quantos badges cada campo mostra antes do "+N mais". */
export const HABILIDADES_MAX_DISPLAY = 9

export function getRemoverItemLabel(nome: string): string {
  return `Remover ${nome}`
}

export function getMaisItensLabel(restantes: number): string {
  return `+${restantes} mais`
}

export function getTituloGrupo(indice: number): string {
  return `Área ${indice + 1}`
}

/** Rótulo do campo com a quantidade marcada: "Conhecimentos (3)". */
export function getRotuloComContagem(rotulo: string, total: number): string {
  return total > 0 ? `${rotulo} (${total})` : rotulo
}

export function getAdicionarAreaLabel(totalGrupos: number): string {
  return totalGrupos === 0
    ? ADICIONAR_PRIMEIRA_AREA_LABEL
    : ADICIONAR_OUTRA_AREA_LABEL
}

// ============================================
// Ordem e badges
// ============================================

const COLLATOR = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
})

/** Itens em ordem A–Z pelo nome (sem diferenciar acento nem caixa). */
export function ordenarPorNome<T extends { nome: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => COLLATOR.compare(a.nome, b.nome))
}

/**
 * Itens marcados, com o nome, em ordem A–Z. O nome vem do catálogo e, se ele
 * ainda não chegou (ou não traz o item), do que a vaga gravou; sem nenhum dos
 * dois, o item aparece pelo id.
 */
export function getItensSelecionados(
  ids: number[],
  catalogo: CatalogoHabilidadeItem[],
  salvos: CatalogoHabilidadeItem[] = []
): CatalogoHabilidadeItem[] {
  const nomes = new Map<number, string>()
  for (const item of salvos) if (item.nome) nomes.set(item.id, item.nome)
  for (const item of catalogo) if (item.nome) nomes.set(item.id, item.nome)
  const vistos = new Set<number>()
  const itens: CatalogoHabilidadeItem[] = []
  for (const id of ids) {
    if (vistos.has(id)) continue
    vistos.add(id)
    itens.push({ id, nome: nomes.get(id) ?? `#${id}` })
  }
  return ordenarPorNome(itens)
}

/** Badges à mostra (até `max`) e quantos ficam no "+N mais". */
export function getBadgesVisiveis<T>(
  itens: T[],
  max: number = HABILIDADES_MAX_DISPLAY
): { visiveis: T[]; restantes: number } {
  const limite = Math.max(0, Math.floor(max))
  return {
    visiveis: itens.slice(0, limite),
    restantes: Math.max(0, itens.length - limite),
  }
}

/** Marca ou desmarca um id, sem repetir. */
export function alternarId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter(atual => atual !== id) : [...ids, id]
}

export function removerId(ids: number[], id: number): number[] {
  return ids.filter(atual => atual !== id)
}

/**
 * Opção que não pode mais ser marcada porque o campo chegou ao limite da API
 * (as já marcadas continuam desmarcáveis).
 */
export function isOpcaoNoLimite(
  marcada: boolean,
  totalMarcadas: number,
  maximo: number | undefined
): boolean {
  return !marcada && maximo !== undefined && totalMarcadas >= maximo
}

// ============================================
// Grupos de área
// ============================================

function isAreaEscolhida(id: number | null | undefined): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0
}

/** Áreas escolhidas nos outros grupos (ficam desabilitadas neste). */
export function getAreasUsadasEmOutrosGrupos(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): Set<number> {
  const usadas = new Set<number>()
  areas.forEach((area, indice) => {
    if (indice !== indiceGrupo && isAreaEscolhida(area.id_area_atuacao)) {
      usadas.add(area.id_area_atuacao)
    }
  })
  return usadas
}

export interface OpcaoArea extends CatalogoHabilidadeItem {
  /** Já escolhida em outro grupo ("Já adicionada"). */
  desabilitada: boolean
}

/**
 * Opções da lista de áreas de um grupo, em ordem A–Z: as do catálogo, com as
 * dos outros grupos desabilitadas, e a área do próprio grupo mesmo que o
 * catálogo não a traga (nome gravado na vaga ou o id).
 */
export function getOpcoesAreaDoGrupo(
  catalogo: CatalogoHabilidadeItem[],
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): OpcaoArea[] {
  const usadas = getAreasUsadasEmOutrosGrupos(areas, indiceGrupo)
  const propria = areas[indiceGrupo]?.id_area_atuacao
  const itens =
    isAreaEscolhida(propria) && !catalogo.some(item => item.id === propria)
      ? [
          ...catalogo,
          { id: propria, nome: areas[indiceGrupo]?.nome || `#${propria}` },
        ]
      : catalogo
  return ordenarPorNome(itens).map(item => ({
    ...item,
    desabilitada: usadas.has(item.id),
  }))
}

/** Nome da área do grupo: o do catálogo, o gravado na vaga ou o id. */
export function getNomeAreaDoGrupo(
  area: VagaAreaAtuacaoSelecionada | undefined,
  catalogo: CatalogoHabilidadeItem[]
): string | undefined {
  const id = area?.id_area_atuacao
  if (!isAreaEscolhida(id)) return undefined
  return catalogo.find(item => item.id === id)?.nome || area?.nome || `#${id}`
}

/** Grupo completo: tem área e ao menos um conhecimento. */
export function isGrupoCompleto(
  area: VagaAreaAtuacaoSelecionada | undefined
): boolean {
  return (
    !!area &&
    isAreaEscolhida(area.id_area_atuacao) &&
    area.conhecimento_ids.length > 0
  )
}

/**
 * Sem nenhum grupo, o botão abre a primeira área. Com grupos, "Adicionar
 * outra área" só habilita quando o último tem área e ao menos um
 * conhecimento, abaixo do limite da API e com área livre no catálogo.
 */
export function podeAdicionarArea({
  areas,
  totalAreasCatalogo,
}: {
  areas: VagaAreaAtuacaoSelecionada[]
  /** Total de áreas do catálogo; `undefined` enquanto não carregou. */
  totalAreasCatalogo?: number
}): boolean {
  if (areas.length === 0) return totalAreasCatalogo !== 0
  if (!isGrupoCompleto(areas[areas.length - 1])) return false
  if (areas.length >= MAX_AREAS_ATUACAO) return false
  if (totalAreasCatalogo !== undefined && areas.length >= totalAreasCatalogo) {
    return false
  }
  return true
}

/** Abre um grupo novo, ainda sem área, no fim da lista. */
export function adicionarGrupo(
  areas: VagaAreaAtuacaoSelecionada[]
): VagaAreaAtuacaoSelecionada[] {
  return [...areas, { id_area_atuacao: null, conhecimento_ids: [] }]
}

/**
 * A lixeira aparece em todo grupo, menos no único grupo ainda vazio (o
 * estado "área recém-adicionada" do Figma).
 */
export function podeRemoverGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): boolean {
  const area = areas[indiceGrupo]
  if (!area) return false
  const vazio =
    !isAreaEscolhida(area.id_area_atuacao) && area.conhecimento_ids.length === 0
  return !(areas.length === 1 && vazio)
}

/**
 * Troca a área de um grupo: os conhecimentos daquele grupo são limpos e os
 * outros grupos ficam como estão. Área já usada em outro grupo é recusada
 * (devolve a lista sem mudança).
 */
export function trocarAreaDoGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number,
  area: CatalogoHabilidadeItem
): VagaAreaAtuacaoSelecionada[] {
  if (!isAreaEscolhida(area.id) || !areas[indiceGrupo]) return areas
  if (getAreasUsadasEmOutrosGrupos(areas, indiceGrupo).has(area.id)) {
    return areas
  }
  if (areas[indiceGrupo]?.id_area_atuacao === area.id) return areas
  const nova: VagaAreaAtuacaoSelecionada = {
    id_area_atuacao: area.id,
    conhecimento_ids: [],
  }
  if (area.nome) nova.nome = area.nome
  return areas.map((atual, indice) => (indice === indiceGrupo ? nova : atual))
}

/** Marca/desmarca conhecimentos de um grupo (só daquele grupo). */
export function setConhecimentosDoGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number,
  conhecimentoIds: number[]
): VagaAreaAtuacaoSelecionada[] {
  return areas.map((area, indice) =>
    indice === indiceGrupo
      ? { ...area, conhecimento_ids: [...new Set(conhecimentoIds)] }
      : area
  )
}

/** Remove o grupo inteiro: a área e os seus conhecimentos. */
export function removerGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): VagaAreaAtuacaoSelecionada[] {
  return areas.filter((_, indice) => indice !== indiceGrupo)
}

// ============================================
// Validação (mensagens no campo)
// ============================================

export interface ErroGrupoHabilidades {
  area?: string
  conhecimentos?: string
}

export interface ErrosAreasHabilidades {
  /** Nenhuma área na vaga. */
  areas?: string
  /** Erros de cada grupo, na mesma ordem das áreas. */
  grupos?: (ErroGrupoHabilidades | undefined)[]
}

/**
 * Erros das áreas para publicar ou enviar para aprovação: ao menos uma área,
 * cada grupo com área (sem repetir) e ao menos um conhecimento. Devolve `{}`
 * quando está tudo certo.
 */
export function getErrosAreasHabilidades(
  areas: VagaAreaAtuacaoSelecionada[] | undefined
): ErrosAreasHabilidades {
  const lista = areas ?? []
  if (lista.length === 0) return { areas: ERRO_AREA_OBRIGATORIA }

  const vistas = new Set<number>()
  const grupos = lista.map(area => {
    const erro: ErroGrupoHabilidades = {}
    if (!isAreaEscolhida(area.id_area_atuacao)) {
      erro.area = ERRO_AREA_DO_GRUPO
    } else if (vistas.has(area.id_area_atuacao)) {
      erro.area = ERRO_AREA_REPETIDA
    } else {
      vistas.add(area.id_area_atuacao)
      if (area.conhecimento_ids.length === 0) {
        erro.conhecimentos = ERRO_CONHECIMENTO_OBRIGATORIO
      }
    }
    return erro.area || erro.conhecimentos ? erro : undefined
  })
  return grupos.some(Boolean) ? { grupos } : {}
}

/** Mensagens distintas dos erros das áreas, para o resumo da publicação. */
export function getMensagensErroAreas(
  areas: VagaAreaAtuacaoSelecionada[] | undefined
): string[] {
  const erros = getErrosAreasHabilidades(areas)
  const mensagens = new Set<string>()
  if (erros.areas) mensagens.add(erros.areas)
  for (const grupo of erros.grupos ?? []) {
    if (grupo?.area) mensagens.add(grupo.area)
    if (grupo?.conhecimentos) mensagens.add(grupo.conhecimentos)
  }
  return [...mensagens]
}
