import { sanitizeRmiValue } from '@/lib/rmi-value'

export const NAO_INFORMADO = 'Não informado'

/** Exibe o dado ou "Não informado" quando o cidadão não preencheu. */
export function valorOuNaoInformado(valor: string | null | undefined): string {
  return sanitizeRmiValue(valor) || NAO_INFORMADO
}

/** Nome social tem prioridade sobre o nome civil. */
export function nomeDeExibicao(pessoa: {
  nome?: string
  nome_social?: string
}): string {
  return valorOuNaoInformado(
    sanitizeRmiValue(pessoa.nome_social) || pessoa.nome
  )
}

/** 38 → "3 anos e 2 meses". O formulário do cidadão pede só a duração, sem datas. */
export function formatarTempoExperiencia(
  meses: number | null | undefined
): string | null {
  if (!meses || meses <= 0) return null

  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const partes: string[] = []
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`)

  return partes.join(' e ')
}

/** "21982780000" → "(21) 98278-0000"; formatos desconhecidos passam como vieram. */
export function formatarCelular(valor: string | null | undefined): string {
  const limpo = sanitizeRmiValue(valor)
  if (!limpo) return NAO_INFORMADO

  let digitos = limpo.replace(/\D/g, '')
  if (digitos.length === 13 && digitos.startsWith('55')) {
    digitos = digitos.slice(2)
  }
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return limpo
}

export function formatarIdade(idade: number | null | undefined): string {
  if (idade === null || idade === undefined) return NAO_INFORMADO
  return `${idade} ${idade === 1 ? 'ano' : 'anos'}`
}
