/**
 * Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) validation utilities
 *
 * CNPJ format: XX.XXX.XXX/XXXX-XX (14 digits, the last two are check digits)
 *
 * Validation algorithm (Receita Federal):
 * - First check digit: first 12 digits with weights 5,4,3,2,9,8,7,6,5,4,3,2
 * - Second check digit: first 13 digits with weights 6,5,4,3,2,9,8,7,6,5,4,3,2
 * - For each: remainder = sum % 11; digit = remainder < 2 ? 0 : 11 - remainder
 */

export const CNPJ_REQUIRED_MESSAGE = 'CNPJ é obrigatório.'
export const CNPJ_LENGTH_MESSAGE = 'CNPJ inválido. Deve conter 14 dígitos.'
export const CNPJ_CHECK_DIGITS_MESSAGE =
  'CNPJ inválido. Os dígitos verificadores não conferem.'

/**
 * Removes all non-numeric characters from a CNPJ string
 * @example
 * cleanCNPJ('11.222.333/0001-81') // '11222333000181'
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

const FIRST_CHECK_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const SECOND_CHECK_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

function calculateCheckDigit(digits: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) {
    sum += Number.parseInt(digits[i], 10) * weights[i]
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Appends the two check digits to the first 12 digits of a CNPJ
 * @example
 * completeCNPJ('112223330001') // '11222333000181'
 */
export function completeCNPJ(base: string): string {
  if (!/^\d{12}$/.test(base)) {
    throw new Error('A base do CNPJ deve ter exatamente 12 dígitos.')
  }
  const first = calculateCheckDigit(base, FIRST_CHECK_WEIGHTS)
  const second = calculateCheckDigit(`${base}${first}`, SECOND_CHECK_WEIGHTS)
  return `${base}${first}${second}`
}

/**
 * Validates a CNPJ and returns the error message, or null when it is valid.
 * Accepts the CNPJ with or without mask; non-string values are rejected.
 */
export function getCNPJValidationError(cnpj: unknown): string | null {
  if (typeof cnpj !== 'string' || cnpj.trim() === '') {
    return CNPJ_REQUIRED_MESSAGE
  }

  const cleaned = cleanCNPJ(cnpj)
  if (cleaned.length !== 14) {
    return CNPJ_LENGTH_MESSAGE
  }

  // Sequences of a single repeated digit pass the checksum but are not real
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return CNPJ_CHECK_DIGITS_MESSAGE
  }

  const firstCheckDigit = calculateCheckDigit(cleaned, FIRST_CHECK_WEIGHTS)
  const secondCheckDigit = calculateCheckDigit(cleaned, SECOND_CHECK_WEIGHTS)
  if (
    firstCheckDigit !== Number.parseInt(cleaned[12], 10) ||
    secondCheckDigit !== Number.parseInt(cleaned[13], 10)
  ) {
    return CNPJ_CHECK_DIGITS_MESSAGE
  }

  return null
}

/**
 * Validates a Brazilian CNPJ using the check digit algorithm
 * @example
 * validateCNPJ('11.222.333/0001-81') // true
 * validateCNPJ('12345678901234') // false
 */
export function validateCNPJ(cnpj: string): boolean {
  return getCNPJValidationError(cnpj) === null
}
