/**
 * Seção "Idade" do bloco de critérios da vaga de empregabilidade (DEV-429,
 * história PREF-634).
 *
 * A seção tem duas opções, cada uma com o seu bloqueio:
 * - "Maiores de 18": continua sendo `idade_minima` = 18 na API (o bloqueio é
 *   o próprio campo; o slug em `/candidatura-bloqueios` é `idade_minima`).
 * - "Jovem Aprendiz": faixa fixa de 14 a 24 anos, sem campo livre de número.
 *   O app-go-api (DEV-428) grava a opção em `jovem_aprendiz` (booleano; no PUT
 *   ausente mantém o gravado) e o bloqueio na chave `jovem_aprendiz` de
 *   `criterios_bloqueio`, que só pode ser ligada com `jovem_aprendiz: true`.
 *   No formulário o switch da opção é o próprio bloqueio: ligado marca a opção
 *   e a chave, desligado tira as duas.
 */

/** Faixa fixa da opção Jovem Aprendiz (constantes do app-go-api). */
export const JOVEM_APRENDIZ_IDADE_MINIMA = 14
export const JOVEM_APRENDIZ_IDADE_MAXIMA = 24

/** Idade gravada em `idade_minima` pela opção Maiores de 18. */
export const MAIORES_DE_18_IDADE_MINIMA = 18

export const IDADE_TITULO = 'Idade'

export const MAIORES_DE_18_LABEL = 'Maiores de 18'
export const MAIORES_DE_18_DESCRICAO = `Candidatos com ${MAIORES_DE_18_IDADE_MINIMA} anos ou mais.`

export const JOVEM_APRENDIZ_LABEL = 'Jovem Aprendiz'
export const JOVEM_APRENDIZ_DESCRICAO = `Candidatos de ${JOVEM_APRENDIZ_IDADE_MINIMA} a ${JOVEM_APRENDIZ_IDADE_MAXIMA} anos.`

/** Chave do critério em `criterios_bloqueio` (também o slug do bloqueio). */
export const CRITERIO_BLOQUEIO_JOVEM_APRENDIZ = 'jovem_aprendiz'

/**
 * Opção Jovem Aprendiz de uma vaga lida da API: ligada quando o bloqueio está
 * ligado (`jovem_aprendiz` em `criterios_bloqueio`). Vaga sem a chave (todas
 * as anteriores à DEV-428) fica desligada.
 */
export function getJovemAprendizDaVaga(vaga: object): boolean {
  const campos: { criterios_bloqueio?: unknown } = vaga
  const criterios = campos.criterios_bloqueio
  return (
    Array.isArray(criterios) &&
    criterios.includes(CRITERIO_BLOQUEIO_JOVEM_APRENDIZ)
  )
}

/**
 * `jovem_aprendiz` no corpo da vaga: sempre um booleano, porque no PUT o
 * campo ausente mantém o valor gravado e só `false` desmarca a opção.
 */
export function getJovemAprendizParaApi(ativo: boolean | null | undefined) {
  return ativo === true
}
