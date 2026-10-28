import { redactCpfForLog } from './log-user-ref'

/**
 * Leitura defensiva da resposta do endpoint de token do Keycloak
 * (`/token`, troca do código de autorização e refresh).
 *
 * O endpoint pode responder com algo que não é o JSON de tokens mesmo com
 * status 200 (ex.: página HTML do WAF ou do proxy). Este módulo nunca lança:
 * devolve os tokens ou o motivo da falha com um resumo seguro para log
 * (status, content-type e início do corpo, com tokens e CPFs mascarados).
 */

const BODY_PREVIEW_LENGTH = 200
const JWT_PATTERN = /eyJ[\w-]*\.[\w-]*\.[\w-]*/g
const TOKEN_FIELD_PATTERN =
  /("(?:access_token|refresh_token|id_token)"\s*:\s*")[^"]*(")/g

export interface KeycloakTokenSet {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  refreshExpiresIn?: number
}

export type KeycloakTokenFailureReason =
  | 'http_error'
  | 'invalid_json'
  | 'missing_access_token'
  | 'unreadable_body'

export interface KeycloakTokenResponseDiagnostics {
  status: number
  contentType: string | null
  bodyPreview: string
}

export type KeycloakTokenResult =
  | { ok: true; tokens: KeycloakTokenSet }
  | {
      ok: false
      reason: KeycloakTokenFailureReason
      diagnostics: KeycloakTokenResponseDiagnostics
    }

/**
 * Prepara o início de um corpo de resposta para log: mascara JWTs, valores
 * de campos de token e CPFs, normaliza espaços e corta em
 * `BODY_PREVIEW_LENGTH` caracteres.
 * @param body - Corpo bruto da resposta
 * @returns trecho seguro para log
 */
export function previewBodyForLog(body: string): string {
  const withoutTokens = body
    .replace(TOKEN_FIELD_PATTERN, '$1[omitido]$2')
    .replace(JWT_PATTERN, '[jwt omitido]')
    .replace(/\s+/g, ' ')
    .trim()
  return redactCpfForLog(withoutTokens).slice(0, BODY_PREVIEW_LENGTH)
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Lê a resposta do endpoint de token do Keycloak sem lançar exceção.
 * @param response - Resposta do `fetch` ao endpoint `/token`
 * @returns os tokens, ou o motivo da falha com o diagnóstico para log
 */
export async function readKeycloakTokenResponse(
  response: Response
): Promise<KeycloakTokenResult> {
  const contentType = response.headers.get('content-type')

  let body: string
  try {
    body = await response.text()
  } catch {
    return {
      ok: false,
      reason: 'unreadable_body',
      diagnostics: { status: response.status, contentType, bodyPreview: '' },
    }
  }

  const failure = (
    reason: KeycloakTokenFailureReason
  ): KeycloakTokenResult => ({
    ok: false,
    reason,
    diagnostics: {
      status: response.status,
      contentType,
      bodyPreview: previewBodyForLog(body),
    },
  })

  if (!response.ok) {
    return failure('http_error')
  }

  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return failure('invalid_json')
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return failure('invalid_json')
  }

  const record = data as Record<string, unknown>
  const accessToken = optionalString(record.access_token)
  if (!accessToken) {
    return failure('missing_access_token')
  }

  return {
    ok: true,
    tokens: {
      accessToken,
      refreshToken: optionalString(record.refresh_token),
      expiresIn: optionalNumber(record.expires_in),
      refreshExpiresIn: optionalNumber(record.refresh_expires_in),
    },
  }
}
