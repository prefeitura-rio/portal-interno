/**
 * Identificador opaco do usuário para correlacionar logs sem expor dado
 * pessoal (CPF, nome, e-mail) do token JWT.
 *
 * O valor é um HMAC-SHA-256 do identificador do token, com uma chave aleatória
 * gerada por processo e nunca persistida: correlaciona as linhas de log do
 * mesmo usuário dentro de uma instância, mas não pode ser revertido para o
 * CPF (nem por força bruta, já que a chave não sai da memória).
 */

const USER_REF_LENGTH = 12
const MAX_LOGGED_TEXT_LENGTH = 500
const CPF_PATTERN = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g

export const ANONYMOUS_USER_REF = 'anon'

let hmacKeyPromise: Promise<CryptoKey> | null = null

function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.generateKey(
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ) as Promise<CryptoKey>
  }
  return hmacKeyPromise
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split('.')[1]
  if (!segment) {
    return null
  }

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function getSubjectFromPayload(
  payload: Record<string, unknown>
): string | null {
  for (const claim of ['sub', 'preferred_username', 'cpf']) {
    const value = payload[claim]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return null
}

/**
 * Deriva do access token um identificador opaco para logs.
 * Nunca devolve o CPF nem outro claim do token; devolve
 * `ANONYMOUS_USER_REF` quando o token não tem identificador legível.
 * @param accessToken - JWT do usuário (cookie `access_token`)
 * @returns identificador hexadecimal curto ou `ANONYMOUS_USER_REF`
 */
export async function getLogUserRef(
  accessToken: string | null | undefined
): Promise<string> {
  if (!accessToken) {
    return ANONYMOUS_USER_REF
  }

  const payload = decodeJwtPayload(accessToken)
  const subject = payload ? getSubjectFromPayload(payload) : null
  if (!subject) {
    return ANONYMOUS_USER_REF
  }

  try {
    const key = await getHmacKey()
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(subject)
    )
    const hex = Array.from(new Uint8Array(signature), byte =>
      byte.toString(16).padStart(2, '0')
    ).join('')
    return `u-${hex.slice(0, USER_REF_LENGTH)}`
  } catch {
    return ANONYMOUS_USER_REF
  }
}

/**
 * Prepara um texto externo (ex.: corpo de erro de API) para log: corta em
 * `MAX_LOGGED_TEXT_LENGTH` caracteres e mascara sequências com formato de CPF.
 * @param text - Texto a registrar
 * @returns texto truncado, com CPFs trocados por `[cpf omitido]`
 */
export function redactCpfForLog(text: string): string {
  return text
    .slice(0, MAX_LOGGED_TEXT_LENGTH)
    .replace(CPF_PATTERN, '[cpf omitido]')
}
