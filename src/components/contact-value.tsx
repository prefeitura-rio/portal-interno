/**
 * Valor de contato de um cidadão, explicitando quando o dado não veio.
 *
 * Omitir o campo vazio esconde do operador que a informação está faltando,
 * em vez de mostrar que está.
 */
export function ContactValue({ value }: { value?: string }) {
  if (!value) {
    return <p className="text-sm text-muted-foreground italic">Não informado</p>
  }

  return <p className="text-sm">{value}</p>
}
