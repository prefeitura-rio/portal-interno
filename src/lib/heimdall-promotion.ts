/**
 * Promoção, de staging para produção, da config do Heimdall que um release
 * precisa.
 *
 * O pipeline de release (action release-check do repo heimdall) descobre os
 * itens e gera o link /heimdall/promocao?release=...&obrigatorio=...&sugerido=...
 * O cálculo e a aplicação ficam no Heimdall de destino
 * (POST /api/v1/config/promotion/plan e /apply).
 */

export type PromotionEntity =
  | 'action'
  | 'mapping'
  | 'role'
  | 'role_action'
  | 'group'
  | 'group_role'

export interface PromotionItem {
  entity: PromotionEntity
  key: string
}

export type PromotionItemStatus =
  | 'missing'
  | 'present'
  | 'not_in_source'
  | 'protected'

export interface PromotionPlanItem extends PromotionItem {
  status: PromotionItemStatus
}

export interface PromotionOperation {
  op: 'create' | 'update'
  entity: PromotionEntity
  key: string
  before: Record<string, unknown> | null
  after: Record<string, unknown>
  dependency: boolean
}

export interface PromotionPlan {
  plan_hash: string
  source: { base_url: string | null; exported_at: string | null } | null
  release: string | null
  items: PromotionPlanItem[]
  operations: PromotionOperation[]
  warnings: string[]
  errors: string[]
}

export interface HeimdallPromotionPreview {
  sourceBaseUrl: string
  targetBaseUrl: string
  plan: PromotionPlan
}

export interface HeimdallPromotionResult {
  applied: boolean
  audit_id: number | null
  plan: PromotionPlan
}

const ENTITIES: PromotionEntity[] = [
  'action',
  'mapping',
  'role',
  'role_action',
  'group',
  'group_role',
]

export const PROMOTION_ENTITY_LABEL: Record<PromotionEntity, string> = {
  action: 'Action',
  mapping: 'Mapping',
  role: 'Papel',
  role_action: 'Action do papel',
  group: 'Grupo',
  group_role: 'Papel do grupo',
}

export const PROMOTION_STATUS_LABEL: Record<PromotionItemStatus, string> = {
  missing: 'Falta em produção',
  present: 'Já está em produção',
  not_in_source: 'Não existe em staging',
  protected: 'Protegido (não promovido)',
}

/** "entity:key", como o pipeline escreve na URL. Null se inválido. */
export function parsePromotionItem(value: string): PromotionItem | null {
  const separator = value.indexOf(':')
  const entity = value.slice(0, separator) as PromotionEntity
  const key = value.slice(separator + 1)
  if (separator < 1 || !ENTITIES.includes(entity) || !key) return null
  return { entity, key }
}

export function promotionItemId(item: PromotionItem): string {
  return `${item.entity}:${item.key}`
}

/** Exibe "papel -> action" como "papel → action". */
export function displayPromotionKey(key: string): string {
  return key.replaceAll(' -> ', ' → ')
}
