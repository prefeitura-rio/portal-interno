import { BUSCA_SERVICES_ADMIN_ROLES } from '@/types/heimdall-roles'

/** Status de serviço na API de busca: 0 = rascunho/edição, 1 = publicado. */
const SERVICE_STATUS_DRAFT = 0

/** Campos de curadoria de um serviço, no corpo enviado ou no serviço atual. */
export interface ServiceCurationFields {
  status?: unknown
  awaiting_approval?: unknown
}

export type ServiceCurationDenial =
  | 'publish'
  | 'edit_published'
  | 'edit_awaiting_approval'
  | 'delete'
  | 'tombamento'

export const SERVICE_CURATION_DENIAL_MESSAGES: Record<
  ServiceCurationDenial,
  string
> = {
  publish: 'Somente o administrador de Serviços pode publicar um serviço',
  edit_published:
    'Somente o administrador de Serviços pode alterar um serviço publicado',
  edit_awaiting_approval:
    'Somente o administrador de Serviços pode alterar um serviço em aprovação',
  delete: 'Somente o administrador de Serviços pode excluir um serviço',
  tombamento: 'Somente o administrador de Serviços pode tombar um serviço',
}

/** Admin do módulo Serviços municipais (o mesmo `isBuscaServicesAdmin` da UI). */
export function isServiceCurator(
  roles: readonly string[] | null | undefined
): boolean {
  if (!roles || roles.length === 0) {
    return false
  }
  return BUSCA_SERVICES_ADMIN_ROLES.some(role => roles.includes(role))
}

function requestsNonDraftStatus(body: ServiceCurationFields): boolean {
  return (
    body.status !== undefined &&
    body.status !== null &&
    body.status !== SERVICE_STATUS_DRAFT
  )
}

/**
 * DEV-125: criar serviço já publicado é ação do admin de Serviços (na UI, só
 * ele vê "Salvar e publicar"). O Editor só cria rascunho, com ou sem envio
 * para aprovação.
 */
export function getServiceCreateDenial(
  roles: readonly string[] | null | undefined,
  body: ServiceCurationFields
): ServiceCurationDenial | null {
  if (isServiceCurator(roles)) {
    return null
  }
  return requestsNonDraftStatus(body) ? 'publish' : null
}

/**
 * DEV-125: o PUT de serviço recebe `status` e `awaiting_approval` no corpo,
 * então sem esta checagem o Editor publicaria, despublicaria ou devolveria
 * para edição pela rota de edição, contornando as rotas restritas ao admin.
 * Como na UI, o Editor só altera serviço em edição e só o mantém em rascunho.
 */
export function getServiceUpdateDenial(
  roles: readonly string[] | null | undefined,
  body: ServiceCurationFields,
  current: ServiceCurationFields
): ServiceCurationDenial | null {
  if (isServiceCurator(roles)) {
    return null
  }
  if (requestsNonDraftStatus(body)) {
    return 'publish'
  }
  if (requestsNonDraftStatus(current)) {
    return 'edit_published'
  }
  if (current.awaiting_approval === true) {
    return 'edit_awaiting_approval'
  }
  return null
}

/**
 * DEV-125: enviar para aprovação só parte de serviço em edição (na UI, o
 * Editor só vê o botão nesse status); de um serviço publicado, a rota o
 * tiraria do ar.
 */
export function getServiceSendToApprovalDenial(
  roles: readonly string[] | null | undefined,
  current: ServiceCurationFields
): ServiceCurationDenial | null {
  return getServiceUpdateDenial(
    roles,
    { status: SERVICE_STATUS_DRAFT },
    current
  )
}

/** DEV-125: excluir serviço é ação do admin de Serviços, como na UI. */
export function getServiceDeleteDenial(
  roles: readonly string[] | null | undefined
): ServiceCurationDenial | null {
  return isServiceCurator(roles) ? null : 'delete'
}

/** DEV-125: tombar serviço é ação do admin de Serviços, como na UI. */
export function getTombamentoCreateDenial(
  roles: readonly string[] | null | undefined
): ServiceCurationDenial | null {
  return isServiceCurator(roles) ? null : 'tombamento'
}
