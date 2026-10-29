// Mensagem de campo obrigatório no zod 4, que tirou o `required_error` das
// opções dos schemas. Como no zod 3, a mensagem só vale quando o valor está
// ausente (undefined); um valor de outro tipo segue com a mensagem padrão.
//
// Uso: z.date({ error: requiredError('Data de início é obrigatória.') })
export function requiredError(message: string) {
  return (issue: { input?: unknown }): string | undefined =>
    issue.input === undefined ? message : undefined
}
