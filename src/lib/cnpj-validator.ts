/**
 * Brazilian CNPJ (Cadastro Nacional da Pessoa Jurídica) validation utilities
 *
 * CNPJ format: XX.XXX.XXX/XXXX-XX (14 characters, the last two are check digits)
 *
 * Since the Receita Federal alphanumeric CNPJ (DEV-182), the first 12
 * positions may be uppercase letters (A–Z) or digits; the last two are always
 * digits. Numeric CNPJs keep working unchanged.
 *
 * Validation algorithm (Receita Federal):
 * - Each character is worth its ASCII code minus 48 ('0'..'9' = 0..9,
 *   'A' = 17, 'B' = 18, ..., 'Z' = 42)
 * - First check digit: first 12 characters with weights 5,4,3,2,9,8,7,6,5,4,3,2
 * - Second check digit: first 13 characters with weights 6,5,4,3,2,9,8,7,6,5,4,3,2
 * - For each: remainder = sum % 11; digit = remainder < 2 ? 0 : 11 - remainder
 */

export const CNPJ_REQUIRED_MESSAGE = 'CNPJ é obrigatório.'
export const CNPJ_LENGTH_MESSAGE =
  'CNPJ inválido. Deve conter 14 caracteres: 12 letras ou números e 2 dígitos verificadores.'
export const CNPJ_CHECK_DIGITS_MESSAGE =
  'CNPJ inválido. Os dígitos verificadores não conferem.'

/** 12 alphanumeric positions followed by 2 numeric check digits */
const CNPJ_PATTERN = /^[0-9A-Z]{12}[0-9]{2}$/
const CNPJ_BASE_PATTERN = /^[0-9A-Z]{12}$/

/**
 * Removes the mask and every character that cannot be part of a CNPJ,
 * keeping digits and letters (converted to uppercase)
 * @example
 * cleanCNPJ('11.222.333/0001-81') // '11222333000181'
 * cleanCNPJ('12.abc.345/01de-35') // '12ABC34501DE35'
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

/**
 * Returns the cleaned CNPJ when it has the CNPJ shape (12 alphanumeric
 * characters + 2 digits), without checking the check digits; null otherwise.
 * Used to address existing companies, whose stored CNPJ may predate the
 * check digit validation.
 */
export function normalizeCNPJ(cnpj: string): string | null {
  const cleaned = cleanCNPJ(cnpj)
  return CNPJ_PATTERN.test(cleaned) ? cleaned : null
}

/**
 * Formats a CNPJ as XX.XXX.XXX/XXXX-XX; returns the input unchanged when it
 * does not have the CNPJ shape
 * @example
 * formatCNPJ('12ABC34501DE35') // '12.ABC.345/01DE-35'
 */
export function formatCNPJ(cnpj: string): string {
  const normalized = normalizeCNPJ(cnpj)
  if (!normalized) return cnpj
  return normalized.replace(
    /^(.{2})(.{3})(.{3})(.{4})(.{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

const FIRST_CHECK_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const SECOND_CHECK_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

function characterValue(character: string): number {
  return character.charCodeAt(0) - 48
}

function calculateCheckDigit(cnpj: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) {
    sum += characterValue(cnpj[i]) * weights[i]
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Appends the two check digits to the first 12 characters of a CNPJ
 * @example
 * completeCNPJ('112223330001') // '11222333000181'
 * completeCNPJ('12ABC34501DE') // '12ABC34501DE35'
 */
export function completeCNPJ(base: string): string {
  if (!CNPJ_BASE_PATTERN.test(base)) {
    throw new Error(
      'A base do CNPJ deve ter exatamente 12 letras maiúsculas ou números.'
    )
  }
  const first = calculateCheckDigit(base, FIRST_CHECK_WEIGHTS)
  const second = calculateCheckDigit(`${base}${first}`, SECOND_CHECK_WEIGHTS)
  return `${base}${first}${second}`
}

/**
 * Validates a CNPJ and returns the error message, or null when it is valid.
 * Accepts the CNPJ with or without mask, numeric or alphanumeric;
 * non-string values are rejected.
 */
export function getCNPJValidationError(cnpj: unknown): string | null {
  if (typeof cnpj !== 'string' || cnpj.trim() === '') {
    return CNPJ_REQUIRED_MESSAGE
  }

  const cleaned = normalizeCNPJ(cnpj)
  if (!cleaned) {
    return CNPJ_LENGTH_MESSAGE
  }

  // Sequences of a single repeated digit pass the checksum but are not real
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return CNPJ_CHECK_DIGITS_MESSAGE
  }

  const firstCheckDigit = calculateCheckDigit(cleaned, FIRST_CHECK_WEIGHTS)
  const secondCheckDigit = calculateCheckDigit(cleaned, SECOND_CHECK_WEIGHTS)
  if (
    firstCheckDigit !== characterValue(cleaned[12]) ||
    secondCheckDigit !== characterValue(cleaned[13])
  ) {
    return CNPJ_CHECK_DIGITS_MESSAGE
  }

  return null
}

/**
 * Validates a Brazilian CNPJ (numeric or alphanumeric) using the check digit
 * algorithm
 * @example
 * validateCNPJ('11.222.333/0001-81') // true
 * validateCNPJ('12.ABC.345/01DE-35') // true
 * validateCNPJ('12345678901234') // false
 */
export function validateCNPJ(cnpj: string): boolean {
  return getCNPJValidationError(cnpj) === null
}
