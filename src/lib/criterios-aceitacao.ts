/**
 * Critérios de aceitação (bloqueio de candidatura) da vaga de empregabilidade.
 *
 * DEV-394: cada critério mostra a tag "Bloqueio ativo" / "Bloqueio desligado"
 * conforme o switch dele, e o bloco segue uma ordem fixa. O PcD ocupa a
 * posição dele desde a DEV-408 e a Experiência em carteira desde a DEV-425.
 * A Idade tem duas opções desde a DEV-429 (Maiores de 18 e Jovem Aprendiz),
 * cada uma com a sua tag.
 */

import type { ExperienciaCarteira } from './vaga-experiencia-carteira'

export const CRITERIOS_ACEITACAO_ORDEM = [
  'pcd',
  'idade',
  'experiencia',
  'escolaridade',
  'idioma',
] as const

export type CriterioAceitacaoId = (typeof CRITERIOS_ACEITACAO_ORDEM)[number]

export type BloqueioEstado = 'ativo' | 'desligado'

export const BLOQUEIO_TAG_LABEL: Record<BloqueioEstado, string> = {
  ativo: 'Bloqueio ativo',
  desligado: 'Bloqueio desligado',
}

export function getBloqueioEstado(ativo: boolean): BloqueioEstado {
  return ativo ? 'ativo' : 'desligado'
}

export function getBloqueioTagLabel(ativo: boolean): string {
  return BLOQUEIO_TAG_LABEL[getBloqueioEstado(ativo)]
}

/**
 * Chaves dos critérios com bloqueio de candidatura que o app-go-api aceita em
 * `criterios_bloqueio` (DEV-392; `pcd` desde a DEV-407,
 * `experiencia_carteira` desde a DEV-424 e `jovem_aprendiz` desde a DEV-428),
 * na ordem em que ele as grava e
 * devolve. Chave fora desta lista é recusada pela API com 400.
 */
export const CRITERIOS_BLOQUEIO_API = [
  'escolaridade',
  'idioma',
  'pcd',
  'experiencia_carteira',
  'jovem_aprendiz',
] as const

export type CriterioBloqueio = (typeof CRITERIOS_BLOQUEIO_API)[number]

/**
 * DEV-400: estado ligado/desligado de cada critério, enviado à API como
 * `criterios_bloqueio` ao criar, duplicar e editar a vaga. No formulário o
 * switch do critério é o próprio bloqueio (DEV-394): escolaridade ligada
 * quando há escolaridade mínima escolhida, idioma ligado quando há ao menos
 * um idioma exigido. O PcD (DEV-408) tem o bloqueio próprio, ligado pelo
 * botão "Ativar bloqueio" e só válido na vaga exclusiva: quem chama passa o
 * estado já resolvido em `bloqueioPcd`. A Experiência em carteira (DEV-425)
 * fica ligada quando há um tempo escolhido em `experienciaCarteira` (a API
 * recusa o bloqueio sem o tempo). A opção Jovem Aprendiz da Idade (DEV-429)
 * fica ligada com `jovemAprendiz` (a API recusa o bloqueio sem
 * `jovem_aprendiz: true`); Maiores de 18 não tem chave aqui, o bloqueio dela é
 * o próprio `idade_minima`. Devolve sempre um array, porque no PUT o
 * campo ausente mantém o estado gravado e só `[]` desliga todos.
 */
export function getCriteriosBloqueio({
  idEscolaridadeMinima,
  idiomasRequisito,
  bloqueioPcd,
  experienciaCarteira,
  jovemAprendiz,
}: {
  idEscolaridadeMinima?: string | null
  idiomasRequisito?: readonly unknown[] | null
  bloqueioPcd?: boolean
  experienciaCarteira?: ExperienciaCarteira | null
  jovemAprendiz?: boolean
}): CriterioBloqueio[] {
  const ligados: Record<CriterioBloqueio, boolean> = {
    escolaridade:
      typeof idEscolaridadeMinima === 'string' &&
      idEscolaridadeMinima.trim() !== '',
    idioma: (idiomasRequisito?.length ?? 0) > 0,
    pcd: bloqueioPcd === true,
    experiencia_carteira: experienciaCarteira != null,
    jovem_aprendiz: jovemAprendiz === true,
  }
  return CRITERIOS_BLOQUEIO_API.filter(criterio => ligados[criterio])
}

/**
 * Devolve os critérios na ordem canônica do bloco, sem alterar o array
 * recebido. Critérios ausentes são simplesmente pulados.
 */
export function ordenarCriteriosAceitacao<
  T extends { id: CriterioAceitacaoId },
>(criterios: readonly T[]): T[] {
  return [...criterios].sort(
    (a, b) =>
      CRITERIOS_ACEITACAO_ORDEM.indexOf(a.id) -
      CRITERIOS_ACEITACAO_ORDEM.indexOf(b.id)
  )
}
