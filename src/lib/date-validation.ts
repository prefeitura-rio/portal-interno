/**
 * Verifica se uma data é futura (maior que o momento atual)
 * @param date - Data a ser validada
 * @returns true se a data for futura, false caso contrário
 */
export function isDateInFuture(date: Date): boolean {
  return date.getTime() > new Date().getTime()
}

/**
 * Mensagem de erro padrão para datas que devem ser futuras
 */
export const FUTURE_DATE_ERROR_MESSAGE =
  'A data selecionada deve ser futura. Não é possível selecionar datas passadas.'
