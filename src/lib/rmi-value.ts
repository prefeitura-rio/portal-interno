/**
 * Valores de contato vindos do RMI podem chegar como a string literal "null" —
 * é o que o app do cidadão gravava ao "excluir" o endereço, e o que aparecia
 * como o texto "null" na interface e nas planilhas exportadas.
 *
 * Trata esses valores como ausentes, devolvendo string vazia.
 */
export function sanitizeRmiValue(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()

  return trimmed.toLowerCase() === 'null' ? '' : trimmed
}
