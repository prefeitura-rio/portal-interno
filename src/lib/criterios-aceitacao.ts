/**
 * Critérios de aceitação (bloqueio de candidatura) da vaga de empregabilidade.
 *
 * DEV-394: cada critério mostra a tag "Bloqueio ativo" / "Bloqueio desligado"
 * conforme o switch dele, e o bloco segue uma ordem fixa. Os critérios que
 * ainda não existem no formulário (PcD, Experiência em carteira) já têm a
 * posição reservada aqui e entram no lugar certo quando forem criados.
 */

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
