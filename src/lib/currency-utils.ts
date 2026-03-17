/**
 * Formata um número para o formato de moeda brasileira (BRL)
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no padrão BRL (ex: "R$ 5.000,00")
 * @example formatNumberToBRL(5000) → "R$ 5.000,00"
 * @example formatNumberToBRL(5000.5) → "R$ 5.000,50"
 * @example formatNumberToBRL(null) → ""
 */
export function formatNumberToBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return ''
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Remove a formatação BRL e converte string para número
 * @param value - String com formatação BRL
 * @returns Número puro ou null se inválido
 * @example parseBRLToNumber("R$ 5.000,00") → 5000
 * @example parseBRLToNumber("5.000,50") → 5000.5
 * @example parseBRLToNumber("") → null
 */
export function parseBRLToNumber(value: string): number | null {
  if (!value || value.trim() === '') {
    return null
  }

  // Remove todos os caracteres não numéricos exceto vírgula e ponto
  // Remove "R$", espaços, e outros símbolos
  let cleanValue = value
    .replace(/[^\d,.-]/g, '') // Mantém apenas dígitos, vírgula, ponto e hífen
    .replace(/\./g, '') // Remove pontos (separadores de milhares)
    .replace(',', '.') // Substitui vírgula por ponto (decimal)

  // Remove possíveis hífens (caso usuário digite números negativos)
  cleanValue = cleanValue.replace(/-/g, '')

  const numericValue = Number.parseFloat(cleanValue)

  if (Number.isNaN(numericValue)) {
    return null
  }

  return numericValue
}

/**
 * Formata string de entrada em tempo real enquanto usuário digita
 * Aplica máscara BRL progressivamente
 * @param value - String sendo digitada
 * @returns String formatada
 * @example formatCurrencyInput("5000") → "R$ 5.000,00"
 * @example formatCurrencyInput("50") → "R$ 50,00"
 */
export function formatCurrencyInput(value: string): string {
  // Remove tudo exceto dígitos
  const digitsOnly = value.replace(/\D/g, '')

  if (digitsOnly === '') {
    return ''
  }

  // Converte para número (centavos)
  // Ex: "5000" → 5000 centavos = 50.00 reais
  const numericValue = Number.parseInt(digitsOnly, 10)

  // Converte centavos para reais
  const valueInReais = numericValue / 100

  // Formata usando Intl
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInReais)
}
