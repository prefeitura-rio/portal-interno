/**
 * Regras do bloco "Habilidades e competências" do formulário da vaga
 * (DEV-526, PREF-663): grupos de área (uma área de atuação com os seus
 * conhecimentos) e a seção de comportamentos/atitudes. O cidadão não vê esses
 * dados.
 *
 * Funções puras (sem React), usadas pelo componente
 * `habilidades-competencias.tsx` e pelos testes.
 */

import {
  type CatalogoHabilidadeItem,
  MAX_AREAS_ATUACAO,
  type VagaAreaAtuacaoSelecionada,
} from './vaga-habilidades'

// ============================================
// Textos do bloco
// ============================================

export const HABILIDADES_TITULO = 'Habilidades e competências'
export const HABILIDADES_DESCRICAO =
  'Áreas, conhecimentos e comportamentos esperados do candidato. Não aparecem para o cidadão.'

export const AREAS_SECAO_TITULO = 'Áreas de atuação e conhecimentos'
export const AREA_LABEL = 'Área de atuação'
export const AREA_PLACEHOLDER = 'Selecione a área'
export const CONHECIMENTOS_LABEL = 'Conhecimentos'
export const CONHECIMENTOS_PLACEHOLDER = 'Selecione os conhecimentos'
export const CONHECIMENTOS_SEM_AREA = 'Selecione a área primeiro'
export const COMPORTAMENTOS_LABEL = 'Comportamentos e atitudes'
export const COMPORTAMENTOS_PLACEHOLDER =
  'Selecione os comportamentos e atitudes'
export const ADICIONAR_AREA_LABEL = 'Adicionar outra área'
export const REMOVER_AREA_LABEL = 'Remover área'
export const BUSCAR_PLACEHOLDER = 'Buscar...'
export const NENHUM_RESULTADO = 'Nenhum resultado encontrado.'
export const NENHUMA_AREA = 'Nenhuma área informada.'
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

/** Mensagens de validação mostradas no campo (a obrigatoriedade é da DEV-527). */
export const ERRO_AREA_OBRIGATORIA = 'Selecione ao menos uma área de atuação.'
export const ERRO_AREA_DO_GRUPO = 'Selecione a área de atuação.'
export const ERRO_AREA_REPETIDA = 'Esta área já foi adicionada em outro grupo.'
export const ERRO_CONHECIMENTO_OBRIGATORIO =
  'Selecione ao menos um conhecimento desta área.'
export const ERRO_COMPORTAMENTO_OBRIGATORIO =
  'Selecione ao menos um comportamento ou atitude.'

/** Quantos badges cada campo mostra antes do "+N mais". */
export const HABILIDADES_MAX_DISPLAY = 9

export function getRemoverItemLabel(nome: string): string {
  return `Remover ${nome}`
}

export function getMaisItensLabel(restantes: number): string {
  return `+${restantes} mais`
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
  return [...itens].sort((a, b) => COLLATOR.compare(a.nome, b.nome) || 0)
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

// ============================================
// Grupos de área
// ============================================

/** Áreas escolhidas nos outros grupos (ficam desabilitadas neste). */
export function getAreasUsadasEmOutrosGrupos(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): Set<number> {
  const usadas = new Set<number>()
  areas.forEach((area, indice) => {
    if (indice !== indiceGrupo) usadas.add(area.id_area_atuacao)
  })
  return usadas
}

export interface OpcaoArea extends CatalogoHabilidadeItem {
  /** Já escolhida em outro grupo. */
  desabilitada: boolean
}

/**
 * Opções do Select de área de um grupo, em ordem A–Z: as do catálogo, com as
 * dos outros grupos desabilitadas, e a área do próprio grupo mesmo que o
 * catálogo não a traga (nome gravado na vaga ou o id).
 */
export function getOpcoesAreaDoGrupo(
  catalogo: CatalogoHabilidadeItem[],
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number
): OpcaoArea[] {
  const usadas = getAreasUsadasEmOutrosGrupos(areas, indiceGrupo)
  const propria = areas[indiceGrupo]
  const itens =
    propria && !catalogo.some(item => item.id === propria.id_area_atuacao)
      ? [
          ...catalogo,
          {
            id: propria.id_area_atuacao,
            nome: propria.nome || `#${propria.id_area_atuacao}`,
          },
        ]
      : catalogo
  return ordenarPorNome(itens).map(item => ({
    ...item,
    desabilitada: usadas.has(item.id),
  }))
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

/** Grupo completo: tem área e ao menos um conhecimento. */
export function isGrupoCompleto(
  area: VagaAreaAtuacaoSelecionada | undefined
): boolean {
  return !!area && area.id_area_atuacao > 0 && area.conhecimento_ids.length > 0
}

/**
 * "Adicionar outra área" só habilita quando o último grupo tem área e ao
 * menos um conhecimento: com um grupo novo (vazio) aberto, o último grupo é
 * ele. Também não habilita sem área livre no catálogo nem acima do limite da
 * API.
 */
export function podeAdicionarArea({
  areas,
  grupoNovoAberto,
  totalAreasCatalogo,
}: {
  areas: VagaAreaAtuacaoSelecionada[]
  grupoNovoAberto: boolean
  /** Total de áreas do catálogo; `undefined` enquanto não carregou. */
  totalAreasCatalogo?: number
}): boolean {
  if (grupoNovoAberto || areas.length === 0) return false
  if (!isGrupoCompleto(areas[areas.length - 1])) return false
  if (areas.length >= MAX_AREAS_ATUACAO) return false
  if (totalAreasCatalogo !== undefined && areas.length >= totalAreasCatalogo) {
    return false
  }
  return true
}

/**
 * Troca a área de um grupo: os conhecimentos daquele grupo são limpos e os
 * outros grupos ficam como estão. Área já usada em outro grupo é recusada
 * (devolve a lista sem mudança).
 */
export function trocarAreaDoGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number,
  idArea: number
): VagaAreaAtuacaoSelecionada[] {
  if (getAreasUsadasEmOutrosGrupos(areas, indiceGrupo).has(idArea)) {
    return areas
  }
  const atual = areas[indiceGrupo]
  if (atual?.id_area_atuacao === idArea) return areas
  const nova: VagaAreaAtuacaoSelecionada = {
    id_area_atuacao: idArea,
    conhecimento_ids: [],
  }
  if (!atual) return [...areas, nova]
  return areas.map((area, indice) => (indice === indiceGrupo ? nova : area))
}

/** Marca/desmarca conhecimentos de um grupo (só daquele grupo). */
export function setConhecimentosDoGrupo(
  areas: VagaAreaAtuacaoSelecionada[],
  indiceGrupo: number,
  conhecimentoIds: number[]
): VagaAreaAtuacaoSelecionada[] {
  return areas.map((area, indice) =>
    indice === indiceGrupo
      ? {
          ...area,
          conhecimento_ids: [...new Set(conhecimentoIds)],
        }
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

export interface ErrosHabilidades {
  /** Erro da lista de áreas como um todo (nenhuma área). */
  areas?: string
  /** Erros de cada grupo, na mesma ordem das áreas. */
  grupos?: (ErroGrupoHabilidades | undefined)[]
  comportamentos?: string
}

/**
 * Erros das habilidades para publicar ou enviar para aprovação: ao menos uma
 * área, cada uma com ao menos um conhecimento, sem área repetida, e ao menos
 * um comportamento. Devolve `{}` quando está tudo certo.
 */
export function getErrosHabilidades({
  areas,
  comportamentoIds,
}: {
  areas: VagaAreaAtuacaoSelecionada[]
  comportamentoIds: number[]
}): ErrosHabilidades {
  const erros: ErrosHabilidades = {}
  if (areas.length === 0) erros.areas = ERRO_AREA_OBRIGATORIA

  const vistas = new Set<number>()
  const grupos = areas.map(area => {
    const erro: ErroGrupoHabilidades = {}
    if (!(area.id_area_atuacao > 0)) {
      erro.area = ERRO_AREA_DO_GRUPO
    } else if (vistas.has(area.id_area_atuacao)) {
      erro.area = ERRO_AREA_REPETIDA
    } else {
      vistas.add(area.id_area_atuacao)
    }
    if (area.conhecimento_ids.length === 0) {
      erro.conhecimentos = ERRO_CONHECIMENTO_OBRIGATORIO
    }
    return erro.area || erro.conhecimentos ? erro : undefined
  })
  if (grupos.some(Boolean)) erros.grupos = grupos

  if (comportamentoIds.length === 0) {
    erros.comportamentos = ERRO_COMPORTAMENTO_OBRIGATORIO
  }
  return erros
}
