import { cleanCNPJ, validateCNPJ } from '@/lib/cnpj-validator'

/**
 * Query params sent to GET /api/empregabilidade/empresas for the text typed in
 * the company selector: a full CNPJ goes as `cnpj`, anything else as `search`.
 */
export type EmpresaSearchParams = { cnpj: string } | { search: string } | null

/**
 * Turns the text typed in the company selector into the search params.
 *
 * - Numeric CNPJ (unchanged rule): 14 or more digits once the mask is removed;
 *   the first 14 digits are sent.
 * - Alphanumeric CNPJ (DEV-182/DEV-195): 12 letters or digits followed by the
 *   2 check digits, with valid check digits, mask and case ignored. The check
 *   digits keep names such as "Supermercado 24" (12 letters + 2 digits) in the
 *   name search.
 */
export function getEmpresaSearchParams(query: string): EmpresaSearchParams {
  const trimmed = query.trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 14) {
    return { cnpj: digits.slice(0, 14) }
  }

  const cleaned = cleanCNPJ(trimmed)
  if (/[A-Z]/.test(cleaned) && validateCNPJ(cleaned)) {
    return { cnpj: cleaned }
  }

  return { search: trimmed }
}
