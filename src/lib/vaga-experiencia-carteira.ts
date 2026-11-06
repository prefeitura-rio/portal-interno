/**
 * Critério "Experiência em carteira" da vaga de empregabilidade (DEV-425,
 * história PREF-633).
 *
 * O app-go-api (DEV-424) grava o tempo exigido em `experiencia_carteira`
 * (`qualquer_tempo` ou `minimo_6_meses`; `""` remove a exigência e, no PUT,
 * ausente mantém o valor gravado) e o bloqueio de candidatura na chave
 * `experiencia_carteira` de `criterios_bloqueio`. Bloqueio ligado sem o tempo
 * é recusado com 400. No formulário o switch do critério é o próprio bloqueio:
 * ligado com uma das duas opções, desligado sem nenhuma.
 */

export const OPCOES_EXPERIENCIA_CARTEIRA = [
  'qualquer_tempo',
  'minimo_6_meses',
] as const

export type ExperienciaCarteira = (typeof OPCOES_EXPERIENCIA_CARTEIRA)[number]

/** Opção marcada ao ligar o critério. */
export const EXPERIENCIA_CARTEIRA_PADRAO: ExperienciaCarteira = 'qualquer_tempo'

export const EXPERIENCIA_CARTEIRA_TITULO = 'Experiência em carteira'

export const EXPERIENCIA_CARTEIRA_LABEL: Record<ExperienciaCarteira, string> = {
  qualquer_tempo: 'Qualquer tempo',
  minimo_6_meses: 'Mínimo de 6 meses',
}

/** Linha de descrição de cada opção, com a regra que a API aplica. */
export const EXPERIENCIA_CARTEIRA_DESCRICAO: Record<
  ExperienciaCarteira,
  string
> = {
  qualquer_tempo: 'Ao menos uma experiência comprovada em carteira.',
  minimo_6_meses:
    'Experiências comprovadas em carteira somando 6 meses ou mais.',
}

/** Chave do critério em `criterios_bloqueio` (também o slug do bloqueio). */
export const CRITERIO_BLOQUEIO_EXPERIENCIA_CARTEIRA = 'experiencia_carteira'

export function isExperienciaCarteira(
  value: unknown
): value is ExperienciaCarteira {
  return (
    typeof value === 'string' &&
    (OPCOES_EXPERIENCIA_CARTEIRA as readonly string[]).includes(value)
  )
}

/**
 * Critério de uma vaga lida da API: a opção quando o bloqueio está ligado
 * (`experiencia_carteira` em `criterios_bloqueio`), `null` quando está
 * desligado. Vaga sem a chave (todas as anteriores à DEV-424) fica desligada.
 * Bloqueio ligado sem opção válida (a API não deixa gravar) mostra a padrão.
 */
export function getExperienciaCarteiraDaVaga(
  vaga: object
): ExperienciaCarteira | null {
  const campos: {
    criterios_bloqueio?: unknown
    experiencia_carteira?: unknown
  } = vaga
  const criterios = campos.criterios_bloqueio
  const ligado =
    Array.isArray(criterios) &&
    criterios.includes(CRITERIO_BLOQUEIO_EXPERIENCIA_CARTEIRA)
  if (!ligado) return null
  return isExperienciaCarteira(campos.experiencia_carteira)
    ? campos.experiencia_carteira
    : EXPERIENCIA_CARTEIRA_PADRAO
}

/**
 * `experiencia_carteira` no corpo da vaga: a opção com o critério ligado e
 * `""` com ele desligado, porque no PUT o campo ausente mantém o valor gravado
 * e só `""` remove a exigência.
 */
export function getExperienciaCarteiraParaApi(
  opcao: ExperienciaCarteira | null | undefined
): ExperienciaCarteira | '' {
  return isExperienciaCarteira(opcao) ? opcao : ''
}
