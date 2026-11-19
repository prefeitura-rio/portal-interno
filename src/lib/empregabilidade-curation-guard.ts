import { getApiV1EmpregabilidadeVagasId } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { getCurrentUserRoles } from '@/lib/heimdall-user'
import {
  VAGA_STATUSES_CLOSED_TO_EDITOR_COM_CURADORIA,
  canApproveCandidatura,
  hasEditorComCuradoriaRestrictions,
} from '@/types/heimdall-roles'
import { NextResponse } from 'next/server'

// DEV-126: a regra por rota (route-permissions) não distingue o status da
// vaga nem o status pedido no corpo. A UI esconde do editor com curadoria
// (sem papel que publique) excluir e editar vaga publicada, pausada ou
// encerrada, e dos editores aprovar candidatura; `DELETE`/`PUT vagas/[id]` e
// `PUT candidaturas/[id]/status`/`bulk-status` servem a essas ações e a outras
// que eles fazem. Estas funções decidem como a UI decide.

/**
 * O editor com curadoria tem restrições, ou não há papéis para conferir
 * (falha fechada: o handler só corre depois do middleware, que já exigiu um
 * papel do módulo).
 */
export function isVagaCurationRestricted(roles: string[] | undefined): boolean {
  if (!roles || roles.length === 0) return true
  return hasEditorComCuradoriaRestrictions(roles)
}

/** Status em que a vaga é só leitura para o editor com curadoria. */
export function isVagaClosedToCuration(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    (
      VAGA_STATUSES_CLOSED_TO_EDITOR_COM_CURADORIA as readonly string[]
    ).includes(status)
  )
}

/**
 * Chave do corpo dobrada como o `encoding/json` do Go casa nomes de campo:
 * `Status`, `STATUS` e `ſtatus` (U+017F) chegam ao campo `status` da API.
 */
function foldJsonKey(key: string): string {
  return Array.from(key, char => char.toLowerCase().toUpperCase()).join('')
}

/** Chaves do corpo que a API de empregabilidade lê como `status`. */
export function vagaStatusKeys(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return []
  return Object.keys(body).filter(key => foldJsonKey(key) === 'STATUS')
}

/**
 * Excluir a vaga, mudar seus requisitos de idioma ou levá-la a rascunho ou a
 * aprovação: o editor com curadoria só o faz com a vaga em edição ou em
 * aprovação.
 */
export function canChangeVaga(
  roles: string[] | undefined,
  currentStatus: unknown
): boolean {
  if (!isVagaCurationRestricted(roles)) return true
  return (
    typeof currentStatus === 'string' && !isVagaClosedToCuration(currentStatus)
  )
}

/**
 * `PUT vagas/[id]`: o editor com curadoria só edita vaga em edição ou
 * aprovação e sem mudar o status pelo corpo (a UI não o envia). Uma chave de
 * status que não seja exatamente `status` só serviria para escapar desta
 * conferência e é recusada.
 */
export function canUpdateVaga(
  roles: string[] | undefined,
  currentStatus: unknown,
  body: unknown
): boolean {
  if (!isVagaCurationRestricted(roles)) return true
  if (typeof currentStatus !== 'string') return false
  if (isVagaClosedToCuration(currentStatus)) return false
  const keys = vagaStatusKeys(body)
  if (keys.length === 0) return true
  if (keys.some(key => key !== 'status')) return false
  return (body as { status?: unknown }).status === currentStatus
}

/** Status da candidatura, no formato da API, que a aprova. */
export const CANDIDATURA_APPROVED_STATUS = 'aprovada'

/**
 * `PUT candidaturas/[id]/status` e `bulk-status`: levar a candidatura ao
 * status aprovado é a mesma ação de `candidaturas/[id]/approve`.
 */
export function canSetCandidaturaStatus(
  roles: string[] | undefined,
  backendStatus: string
): boolean {
  if (backendStatus !== CANDIDATURA_APPROVED_STATUS) return true
  return canApproveCandidatura(roles)
}

export const VAGA_CURATION_FORBIDDEN_MESSAGE =
  'Ação restrita a quem publica vagas sem curadoria'

export const CANDIDATURA_APPROVAL_FORBIDDEN_MESSAGE =
  'Aprovar candidatura é restrito aos administradores do módulo'

export function forbidden(message: string): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status: 403 })
}

/**
 * Confere `canChangeVaga` contra o status atual da vaga e devolve a resposta
 * de recusa, ou `null` para seguir. Quem publica vagas segue sem a leitura da
 * vaga; sem conseguir ler o status, recusa (falha fechada).
 */
export async function denyVagaChangeForCuration(
  vagaId: string,
  action: string
): Promise<NextResponse | null> {
  const roles = await getCurrentUserRoles()
  if (!isVagaCurationRestricted(roles)) return null

  const response = await getApiV1EmpregabilidadeVagasId(vagaId)
  if (response.status !== 200) {
    return NextResponse.json(
      { error: 'Não foi possível conferir o status da vaga', success: false },
      { status: response.status >= 500 ? 502 : response.status }
    )
  }

  const currentStatus = response.data.status
  if (!canChangeVaga(roles, currentStatus)) {
    console.warn(
      `[EMPREGABILIDADE] ${action} denied for vaga ${vagaId} with status "${currentStatus}": requires a vaga publish role`
    )
    return forbidden(VAGA_CURATION_FORBIDDEN_MESSAGE)
  }

  return null
}
