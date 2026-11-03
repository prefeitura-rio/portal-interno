// DEV-167: as rotas do BFF que publicam uma vaga (criar e publicar, salvar
// uma vaga fora do modo rascunho e publicar) só conferiam se `data_limite`
// estava presente. O formulário recusa data limite no passado, mas uma
// chamada direta à rota publicava a vaga já vencida. A regra agora vale
// também no servidor, com o mesmo critério do formulário (`isDateInFuture`).

import { isDateInFuture } from '@/lib/date-validation'

export const DATA_LIMITE_REQUIRED_MESSAGE =
  'Data Limite é obrigatória para publicação.'

export const DATA_LIMITE_INVALID_MESSAGE =
  'Data Limite inválida. Informe uma data e hora válidas.'

export const DATA_LIMITE_NOT_IN_FUTURE_MESSAGE =
  'A Data Limite deve ser futura. Não é possível publicar a vaga com data e hora passadas.'

/** Rótulo do campo, como as rotas de vaga o citam em `missingFields`. */
export const DATA_LIMITE_FIELD_LABEL = 'Data Limite'

/**
 * Valida a `data_limite` de uma vaga que vai ser publicada (ou mantida
 * publicada). Devolve a mensagem de erro ou `null` quando a data é válida e
 * estritamente posterior ao momento da validação.
 */
export function validateVagaDataLimite(value: unknown): string | null {
  if (value === undefined || value === null) {
    return DATA_LIMITE_REQUIRED_MESSAGE
  }
  if (typeof value !== 'string') return DATA_LIMITE_INVALID_MESSAGE
  if (value.trim() === '') return DATA_LIMITE_REQUIRED_MESSAGE

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return DATA_LIMITE_INVALID_MESSAGE

  return isDateInFuture(date) ? null : DATA_LIMITE_NOT_IN_FUTURE_MESSAGE
}
