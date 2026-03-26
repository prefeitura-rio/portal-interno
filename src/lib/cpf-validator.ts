/**
 * Brazilian CPF (Cadastro de Pessoa Física) validation utilities
 *
 * CPF format: XXX.XXX.XXX-XX (11 digits with check digits)
 *
 * Validation algorithm:
 * - First check digit: sum of first 9 digits with weights 10-2
 * - Second check digit: sum of first 10 digits with weights 11-2
 */

/**
 * Removes all non-numeric characters from CPF string
 * @param cpf - CPF string (formatted or unformatted)
 * @returns Clean CPF with only digits
 * @example
 * cleanCPF('123.456.789-09') // '12345678909'
 * cleanCPF('123 456 789 09') // '12345678909'
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Formats CPF string to XXX.XXX.XXX-XX pattern
 * Handles incomplete inputs gracefully
 * @param cpf - CPF string (any format)
 * @returns Formatted CPF string
 * @example
 * formatCPF('12345678909') // '123.456.789-09'
 * formatCPF('123456') // '123.456'
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf)

  // Handle incomplete inputs
  if (cleaned.length <= 3) {
    return cleaned
  }
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
  }
  if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`
  }

  // Full format
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

/**
 * Known invalid CPF patterns (all same digits)
 * These are commonly used test CPFs that should be rejected
 */
const INVALID_PATTERNS = [
  '00000000000',
  '11111111111',
  '22222222222',
  '33333333333',
  '44444444444',
  '55555555555',
  '66666666666',
  '77777777777',
  '88888888888',
  '99999999999',
]

/**
 * Calculates CPF check digit using the Brazilian algorithm
 * @param cpf - CPF digits (string or array)
 * @param length - Number of digits to use (9 for first check, 10 for second)
 * @returns Check digit (0-9)
 */
function calculateCheckDigit(cpf: string, length: number): number {
  let sum = 0
  const startWeight = length + 1

  for (let i = 0; i < length; i++) {
    const digit = Number.parseInt(cpf[i], 10)
    const weight = startWeight - i
    sum += digit * weight
  }

  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Validates Brazilian CPF using check digit algorithm
 * @param cpf - CPF string (formatted or unformatted)
 * @returns true if CPF is valid, false otherwise
 * @example
 * validateCPF('123.456.789-09') // true/false
 * validateCPF('12345678909') // true/false
 * validateCPF('111.111.111-11') // false (known invalid pattern)
 */
export function validateCPF(cpf: string): boolean {
  // Clean the input
  const cleaned = cleanCPF(cpf)

  // Check length
  if (cleaned.length !== 11) {
    return false
  }

  // Check for known invalid patterns (all same digits)
  if (INVALID_PATTERNS.includes(cleaned)) {
    return false
  }

  // Calculate first check digit
  const firstCheckDigit = calculateCheckDigit(cleaned, 9)
  if (firstCheckDigit !== Number.parseInt(cleaned[9], 10)) {
    return false
  }

  // Calculate second check digit
  const secondCheckDigit = calculateCheckDigit(cleaned, 10)
  if (secondCheckDigit !== Number.parseInt(cleaned[10], 10)) {
    return false
  }

  return true
}

/**
 * Checks if a string looks like a CPF (has 11 digits when cleaned)
 * Does NOT validate check digits - use validateCPF for full validation
 * @param cpf - String to check
 * @returns true if string has 11 digits
 */
export function isCPFFormat(cpf: string): boolean {
  return cleanCPF(cpf).length === 11
}
