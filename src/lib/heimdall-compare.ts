/**
 * Comparação staging × produção do Heimdall (port de
 * heimdall-frontend/scripts/compare_mappings.py).
 */

export const HEIMDALL_PROD_BASE_URL = 'https://services.pref.rio/heimdall-admin'
export const HEIMDALL_STAGING_BASE_URL =
  'https://services.staging.app.dados.rio/heimdall-admin'

const ALLOWED_HOSTS = new Set([
  'services.pref.rio',
  'services.staging.app.dados.rio',
])

export type CompareStatus = 'MATCH' | 'MISMATCH' | 'ONLY_PROD' | 'ONLY_STAGING'

export const COMPARE_STATUS_ORDER: Record<CompareStatus, number> = {
  MISMATCH: 0,
  ONLY_PROD: 1,
  ONLY_STAGING: 2,
  MATCH: 3,
}

export interface HeimdallMappingInput {
  path_pattern: string
  method: string
  action: string
}

export interface HeimdallNamedInput {
  name: string
}

export interface StatusCounts {
  MATCH: number
  MISMATCH: number
  ONLY_PROD: number
  ONLY_STAGING: number
}

export interface MappingCompareRow {
  pathPattern: string
  method: string
  prodAction: string
  stagingAction: string
  status: CompareStatus
}

export interface SetCompareRow {
  name: string
  prodItems: string[]
  stagingItems: string[]
  onlyProd: string[]
  onlyStaging: string[]
  status: CompareStatus
}

export interface DimensionCompareResult<T> {
  rows: T[]
  counts: StatusCounts
  total: number
}

export type CompareActionItemDimension =
  | 'mappings'
  | 'actions'
  | 'roles'
  | 'groups'

export interface CompareActionItem {
  id: string
  dimension: CompareActionItemDimension
  status: Exclude<CompareStatus, 'MATCH'>
  title: string
  description: string
  /** Texto/JSON pronto para colar ao criar/ajustar no Heimdall */
  copyPayload: string
}

export interface HeimdallCompareResult {
  generatedAt: string
  prodBaseUrl: string
  stagingBaseUrl: string
  currentLabel: 'produção' | 'staging' | 'desconhecido'
  otherLabel: 'produção' | 'staging' | 'desconhecido'
  dimensions: {
    mappings: DimensionCompareResult<MappingCompareRow>
    actions: DimensionCompareResult<SetCompareRow>
    roles: DimensionCompareResult<SetCompareRow>
    groups: DimensionCompareResult<SetCompareRow>
  }
  actionItems: CompareActionItem[]
}

export interface EnvSnapshot {
  mappings: HeimdallMappingInput[]
  actions: HeimdallNamedInput[]
  roles: HeimdallNamedInput[]
  /** role name → action names */
  roleActions: Record<string, string[]>
  groups: HeimdallNamedInput[]
  /** group name → role names */
  groupRoles: Record<string, string[]>
}

function emptyCounts(): StatusCounts {
  return { MATCH: 0, MISMATCH: 0, ONLY_PROD: 0, ONLY_STAGING: 0 }
}

function countStatuses<T extends { status: CompareStatus }>(
  rows: T[]
): StatusCounts {
  const counts = emptyCounts()
  for (const row of rows) {
    counts[row.status]++
  }
  return counts
}

function setDiff(
  a: Set<string>,
  b: Set<string>
): {
  onlyA: string[]
  onlyB: string[]
} {
  return {
    onlyA: [...a].filter(x => !b.has(x)).sort(),
    onlyB: [...b].filter(x => !a.has(x)).sort(),
  }
}

function resolveSetStatus(
  inProd: boolean,
  inStaging: boolean,
  prodSet: Set<string>,
  stagingSet: Set<string>
): CompareStatus {
  if (inProd && inStaging) {
    if (prodSet.size === stagingSet.size) {
      for (const item of prodSet) {
        if (!stagingSet.has(item)) return 'MISMATCH'
      }
      return 'MATCH'
    }
    return 'MISMATCH'
  }
  if (inProd) return 'ONLY_PROD'
  return 'ONLY_STAGING'
}

export function labelForHeimdallBaseUrl(
  baseUrl: string
): 'produção' | 'staging' | 'desconhecido' {
  try {
    const host = new URL(baseUrl).hostname
    if (host === 'services.pref.rio') return 'produção'
    if (host === 'services.staging.app.dados.rio') return 'staging'
  } catch {
    // ignore
  }
  return 'desconhecido'
}

export function suggestedCompareBaseUrl(currentBaseUrl: string): string {
  const label = labelForHeimdallBaseUrl(currentBaseUrl)
  if (label === 'produção') return HEIMDALL_STAGING_BASE_URL
  return HEIMDALL_PROD_BASE_URL
}

/**
 * Valida URL do outro ambiente (anti-SSRF).
 * Aceita hosts allowlisted e path começando com /heimdall-admin.
 */
export function assertAllowedHeimdallCompareUrl(rawUrl: string): string {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new Error('URL inválida')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('A URL deve usar HTTPS')
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      'Host não permitido. Use services.pref.rio ou services.staging.app.dados.rio'
    )
  }

  const path = parsed.pathname.replace(/\/+$/, '') || '/'
  if (path !== '/heimdall-admin' && !path.startsWith('/heimdall-admin/')) {
    throw new Error('Path deve ser /heimdall-admin')
  }

  // Normaliza para origin + /heimdall-admin (sem trailing slash)
  return `${parsed.origin}/heimdall-admin`
}

export function compareMappings(
  prodMappings: HeimdallMappingInput[],
  stagingMappings: HeimdallMappingInput[]
): DimensionCompareResult<MappingCompareRow> {
  const prod = new Map<string, string>()
  const staging = new Map<string, string>()

  for (const m of prodMappings) {
    prod.set(`${m.method.toUpperCase()}\0${m.path_pattern}`, m.action)
  }
  for (const m of stagingMappings) {
    staging.set(`${m.method.toUpperCase()}\0${m.path_pattern}`, m.action)
  }

  const keys = new Set([...prod.keys(), ...staging.keys()])
  const rows: MappingCompareRow[] = []

  for (const key of keys) {
    const [method, pathPattern] = key.split('\0')
    const prodAction = prod.get(key) ?? ''
    const stagingAction = staging.get(key) ?? ''
    const inProd = prod.has(key)
    const inStaging = staging.has(key)

    let status: CompareStatus
    if (inProd && inStaging) {
      status = prodAction === stagingAction ? 'MATCH' : 'MISMATCH'
    } else if (inProd) {
      status = 'ONLY_PROD'
    } else {
      status = 'ONLY_STAGING'
    }

    rows.push({
      pathPattern,
      method,
      prodAction,
      stagingAction,
      status,
    })
  }

  rows.sort(
    (a, b) =>
      COMPARE_STATUS_ORDER[a.status] - COMPARE_STATUS_ORDER[b.status] ||
      a.pathPattern.localeCompare(b.pathPattern) ||
      a.method.localeCompare(b.method)
  )

  return { rows, counts: countStatuses(rows), total: rows.length }
}

function compareNamedSets(
  prodNames: Set<string>,
  stagingNames: Set<string>,
  prodItemsByName: Record<string, string[]>,
  stagingItemsByName: Record<string, string[]>
): DimensionCompareResult<SetCompareRow> {
  const names = new Set([...prodNames, ...stagingNames])
  const rows: SetCompareRow[] = []

  for (const name of names) {
    const prodSet = new Set(prodItemsByName[name] ?? [])
    const stagingSet = new Set(stagingItemsByName[name] ?? [])
    const inProd = prodNames.has(name)
    const inStaging = stagingNames.has(name)
    const status = resolveSetStatus(inProd, inStaging, prodSet, stagingSet)
    const { onlyA: onlyProd, onlyB: onlyStaging } = setDiff(prodSet, stagingSet)

    rows.push({
      name,
      prodItems: [...prodSet].sort(),
      stagingItems: [...stagingSet].sort(),
      onlyProd,
      onlyStaging,
      status,
    })
  }

  rows.sort(
    (a, b) =>
      COMPARE_STATUS_ORDER[a.status] - COMPARE_STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name)
  )

  return { rows, counts: countStatuses(rows), total: rows.length }
}

function indexMappingsByAction(
  mappings: HeimdallMappingInput[]
): Record<string, string[]> {
  const idx: Record<string, Set<string>> = {}
  for (const m of mappings) {
    if (!m.action) continue
    const key = `${m.method.toUpperCase()} ${m.path_pattern}`
    if (!idx[m.action]) idx[m.action] = new Set()
    idx[m.action].add(key)
  }
  const out: Record<string, string[]> = {}
  for (const [action, set] of Object.entries(idx)) {
    out[action] = [...set]
  }
  return out
}

export function compareActions(
  prodActions: HeimdallNamedInput[],
  stagingActions: HeimdallNamedInput[],
  prodMappings: HeimdallMappingInput[],
  stagingMappings: HeimdallMappingInput[]
): DimensionCompareResult<SetCompareRow> {
  return compareNamedSets(
    new Set(prodActions.map(a => a.name)),
    new Set(stagingActions.map(a => a.name)),
    indexMappingsByAction(prodMappings),
    indexMappingsByAction(stagingMappings)
  )
}

export function compareRoles(
  prodRoles: HeimdallNamedInput[],
  stagingRoles: HeimdallNamedInput[],
  prodRoleActions: Record<string, string[]>,
  stagingRoleActions: Record<string, string[]>
): DimensionCompareResult<SetCompareRow> {
  return compareNamedSets(
    new Set(prodRoles.map(r => r.name)),
    new Set(stagingRoles.map(r => r.name)),
    prodRoleActions,
    stagingRoleActions
  )
}

export function compareGroups(
  prodGroups: HeimdallNamedInput[],
  stagingGroups: HeimdallNamedInput[],
  prodGroupRoles: Record<string, string[]>,
  stagingGroupRoles: Record<string, string[]>
): DimensionCompareResult<SetCompareRow> {
  return compareNamedSets(
    new Set(prodGroups.map(g => g.name)),
    new Set(stagingGroups.map(g => g.name)),
    prodGroupRoles,
    stagingGroupRoles
  )
}

function buildActionItems(
  dimensions: HeimdallCompareResult['dimensions']
): CompareActionItem[] {
  const items: CompareActionItem[] = []

  for (const row of dimensions.mappings.rows) {
    if (row.status === 'MATCH') continue

    if (row.status === 'ONLY_STAGING') {
      const payload = {
        path_pattern: row.pathPattern,
        method: row.method,
        action: row.stagingAction,
      }
      items.push({
        id: `mapping-stg-${row.method}-${row.pathPattern}`,
        dimension: 'mappings',
        status: row.status,
        title: `Criar mapping em produção: ${row.method} ${row.pathPattern}`,
        description: `Action: ${row.stagingAction}`,
        copyPayload: JSON.stringify(payload, null, 2),
      })
    } else if (row.status === 'ONLY_PROD') {
      const payload = {
        path_pattern: row.pathPattern,
        method: row.method,
        action: row.prodAction,
      }
      items.push({
        id: `mapping-prod-${row.method}-${row.pathPattern}`,
        dimension: 'mappings',
        status: row.status,
        title: `Criar mapping em staging: ${row.method} ${row.pathPattern}`,
        description: `Action: ${row.prodAction}`,
        copyPayload: JSON.stringify(payload, null, 2),
      })
    } else {
      items.push({
        id: `mapping-mis-${row.method}-${row.pathPattern}`,
        dimension: 'mappings',
        status: row.status,
        title: `Alinhar mapping: ${row.method} ${row.pathPattern}`,
        description: `Produção: ${row.prodAction || '—'} · Staging: ${row.stagingAction || '—'}`,
        copyPayload: JSON.stringify(
          {
            path_pattern: row.pathPattern,
            method: row.method,
            prod_action: row.prodAction,
            staging_action: row.stagingAction,
          },
          null,
          2
        ),
      })
    }
  }

  const setDimensionMeta: Array<{
    key: 'actions' | 'roles' | 'groups'
    entityLabel: string
    itemLabel: string
  }> = [
    { key: 'actions', entityLabel: 'action', itemLabel: 'mappings' },
    { key: 'roles', entityLabel: 'papel', itemLabel: 'actions' },
    { key: 'groups', entityLabel: 'grupo', itemLabel: 'papéis' },
  ]

  for (const meta of setDimensionMeta) {
    for (const row of dimensions[meta.key].rows) {
      if (row.status === 'MATCH') continue

      if (row.status === 'ONLY_STAGING') {
        items.push({
          id: `${meta.key}-stg-${row.name}`,
          dimension: meta.key,
          status: row.status,
          title: `Criar ${meta.entityLabel} em produção: ${row.name}`,
          description: `Staging tem ${row.stagingItems.length} ${meta.itemLabel}`,
          copyPayload: JSON.stringify(
            { name: row.name, staging_items: row.stagingItems },
            null,
            2
          ),
        })
      } else if (row.status === 'ONLY_PROD') {
        items.push({
          id: `${meta.key}-prod-${row.name}`,
          dimension: meta.key,
          status: row.status,
          title: `Criar ${meta.entityLabel} em staging: ${row.name}`,
          description: `Produção tem ${row.prodItems.length} ${meta.itemLabel}`,
          copyPayload: JSON.stringify(
            { name: row.name, prod_items: row.prodItems },
            null,
            2
          ),
        })
      } else {
        items.push({
          id: `${meta.key}-mis-${row.name}`,
          dimension: meta.key,
          status: row.status,
          title: `Alinhar ${meta.entityLabel}: ${row.name}`,
          description: [
            row.onlyProd.length
              ? `Só em prod: ${row.onlyProd.join(', ')}`
              : null,
            row.onlyStaging.length
              ? `Só em staging: ${row.onlyStaging.join(', ')}`
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
          copyPayload: JSON.stringify(
            {
              name: row.name,
              only_prod: row.onlyProd,
              only_staging: row.onlyStaging,
            },
            null,
            2
          ),
        })
      }
    }
  }

  return items
}

export function buildHeimdallCompareResult(input: {
  prodBaseUrl: string
  stagingBaseUrl: string
  currentBaseUrl: string
  compareBaseUrl: string
  prod: EnvSnapshot
  staging: EnvSnapshot
}): HeimdallCompareResult {
  const mappings = compareMappings(input.prod.mappings, input.staging.mappings)
  const actions = compareActions(
    input.prod.actions,
    input.staging.actions,
    input.prod.mappings,
    input.staging.mappings
  )
  const roles = compareRoles(
    input.prod.roles,
    input.staging.roles,
    input.prod.roleActions,
    input.staging.roleActions
  )
  const groups = compareGroups(
    input.prod.groups,
    input.staging.groups,
    input.prod.groupRoles,
    input.staging.groupRoles
  )

  const dimensions = { mappings, actions, roles, groups }

  return {
    generatedAt: new Date().toISOString(),
    prodBaseUrl: input.prodBaseUrl,
    stagingBaseUrl: input.stagingBaseUrl,
    currentLabel: labelForHeimdallBaseUrl(input.currentBaseUrl),
    otherLabel: labelForHeimdallBaseUrl(input.compareBaseUrl),
    dimensions,
    actionItems: buildActionItems(dimensions),
  }
}
