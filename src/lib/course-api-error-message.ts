// DEV-94: o BFF de cursos devolvia só um texto genérico quando a API de cursos
// (app-go-api) recusava uma ação, e o toast do portal não mostrava a causa.
// Estas funções extraem a mensagem que a API devolveu para o portal exibir.

const MAX_MESSAGE_LENGTH = 300

function normalizeMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const message = value.replace(/\s+/g, ' ').trim()
  if (!message) return undefined
  if (message.length <= MAX_MESSAGE_LENGTH) return message
  return `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
}

/**
 * Mensagem de erro do corpo de uma resposta da API de cursos: `error` ou
 * `message` do JSON (o app-go-api responde `{ "error": "..." }`) ou o texto
 * puro da resposta. Corpo sem mensagem (HTML de proxy, vazio) devolve
 * `undefined`.
 */
export function extractCourseApiErrorMessage(
  data: unknown
): string | undefined {
  if (typeof data === 'string') {
    if (/^\s*</.test(data)) return undefined
    return normalizeMessage(data)
  }
  if (!data || typeof data !== 'object') return undefined
  const body = data as { error?: unknown; message?: unknown }
  return normalizeMessage(body.error) ?? normalizeMessage(body.message)
}

/**
 * Texto do campo `error` que o BFF devolve ao portal quando a API de cursos
 * recusa a ação: o texto genérico, o status HTTP da API e a mensagem dela.
 */
export function courseApiErrorMessage(
  fallback: string,
  status: number,
  data: unknown
): string {
  const apiMessage = extractCourseApiErrorMessage(data)
  const base = `${fallback} (HTTP ${status})`
  return apiMessage ? `${base}: ${apiMessage}` : base
}
