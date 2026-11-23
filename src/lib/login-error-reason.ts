import type { OAuthStateCheck } from './oauth-state'

/**
 * Motivo mostrado em `/login-error` (DEV-774). O callback do Keycloak manda o
 * motivo na query para a página não repetir, para um login que só expirou, o
 * texto de indisponibilidade do serviço de identidade.
 *
 * Módulo puro: roda no callback (servidor) e na página (cliente).
 */
export const LOGIN_ERROR_REASON_PARAM = 'reason'

/**
 * - `expired`: o `state` do OAuth não está mais no cookie deste navegador ou é
 *   de outro login (demorou mais que a validade do state no gov.br, voltou em
 *   outra aba ou navegador). Entrar de novo resolve.
 * - `failed`: falha real na comunicação com o serviço de identidade.
 */
export type LoginErrorReason = 'expired' | 'failed'

type RejectedOAuthStateReason = Extract<
  OAuthStateCheck,
  { ok: false }
>['reason']

/**
 * Motivo da página de erro para um `state` recusado. `missing_query_state`
 * (iframe do logout do gov.br ou requisição forjada) não é login expirado.
 */
export function loginErrorReasonForStateCheck(
  reason: RejectedOAuthStateReason
): LoginErrorReason {
  switch (reason) {
    case 'missing_cookie':
    case 'mismatch':
      return 'expired'
    case 'missing_query_state':
      return 'failed'
  }
}

/**
 * Lê o motivo da query por lista fechada: qualquer valor desconhecido,
 * ausente ou repetido mostra a mensagem genérica de falha.
 */
export function parseLoginErrorReason(
  value: string | string[] | null | undefined
): LoginErrorReason {
  return value === 'expired' ? 'expired' : 'failed'
}

export type LoginErrorMessage = {
  readonly title: string
  readonly description: string
}

const LOGIN_ERROR_MESSAGES: Record<LoginErrorReason, LoginErrorMessage> = {
  expired: {
    title: 'Seu login expirou',
    description:
      'O tempo para concluir a entrada pelo gov.br acabou ou o login foi iniciado em outra aba ou navegador. Entre novamente para continuar.',
  },
  failed: {
    title: 'Não foi possível concluir o login',
    description:
      'Houve uma falha na comunicação com o serviço de identidade. Tente entrar novamente em alguns instantes.',
  },
}

export function getLoginErrorMessage(
  reason: LoginErrorReason
): LoginErrorMessage {
  return LOGIN_ERROR_MESSAGES[reason]
}
