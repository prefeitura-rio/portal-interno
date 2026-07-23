import { listActionsApiV1ActionsGet } from '@/http-heimdall/actions/actions'
import { listGroupsApiV1GroupsGet } from '@/http-heimdall/groups/groups'
import { listMappingsApiV1MappingsListGet } from '@/http-heimdall/mappings/mappings'
import {
  listGroupRolesApiV1RolesGroupsGroupNameRolesGet,
  listRoleActionsApiV1RolesRoleNameActionsGet,
  listRolesApiV1RolesGet,
} from '@/http-heimdall/roles/roles'
import {
  type EnvSnapshot,
  HEIMDALL_PROD_BASE_URL,
  HEIMDALL_STAGING_BASE_URL,
  type HeimdallMappingInput,
  type HeimdallNamedInput,
  assertAllowedHeimdallCompareUrl,
  buildHeimdallCompareResult,
  labelForHeimdallBaseUrl,
  suggestedCompareBaseUrl,
} from '@/lib/heimdall-compare'
import { NextResponse } from 'next/server'

const PAGE_LIMIT = 100

interface CompareRequestBody {
  compareBaseUrl?: string
  compareJwt?: string
}

function getCurrentHeimdallBaseUrl(): string {
  const baseUrl = process.env.HEIMDALL_BASE_API_URL
  if (!baseUrl) {
    throw new Error('HEIMDALL_BASE_API_URL não configurada')
  }
  return baseUrl.replace(/\/+$/, '')
}

async function fetchRemoteJson<T>(
  baseUrl: string,
  jwt: string,
  path: string
): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    // Nunca incluir o JWT na mensagem
    throw new Error(
      `Falha ao consultar o outro ambiente (${response.status}) em ${path}`
    )
  }

  return (await response.json()) as T
}

async function fetchRemotePaginatedItems<T>(
  baseUrl: string,
  jwt: string,
  path: string,
  itemsKey: 'actions' | 'items'
): Promise<T[]> {
  const all: T[] = []
  let skip = 0

  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const pagePath = `${path}${sep}skip=${skip}&limit=${PAGE_LIMIT}`
    const data = await fetchRemoteJson<
      Record<string, unknown> & { total?: number; has_more?: boolean }
    >(baseUrl, jwt, pagePath)

    const items = (data[itemsKey] as T[] | undefined) ?? []
    all.push(...items)

    if (typeof data.has_more === 'boolean') {
      if (!data.has_more) break
    } else if (typeof data.total === 'number') {
      if (skip + items.length >= data.total) break
    } else if (items.length < PAGE_LIMIT) {
      break
    }

    skip += PAGE_LIMIT
  }

  return all
}

async function fetchCurrentSnapshot(): Promise<EnvSnapshot> {
  const mappingsRes = await listMappingsApiV1MappingsListGet()
  if (mappingsRes.status !== 200) {
    throw new Error('Erro ao listar mapeamentos do ambiente atual')
  }

  const groupsRes = await listGroupsApiV1GroupsGet()
  if (groupsRes.status !== 200) {
    throw new Error('Erro ao listar grupos do ambiente atual')
  }

  const mappings: HeimdallMappingInput[] = (
    Array.isArray(mappingsRes.data) ? mappingsRes.data : []
  ).map(m => ({
    path_pattern: m.path_pattern,
    method: m.method,
    action: m.action,
  }))

  const groups: HeimdallNamedInput[] = (
    Array.isArray(groupsRes.data) ? groupsRes.data : []
  ).map(g => ({ name: g.name }))

  const actions: HeimdallNamedInput[] = []
  {
    let skip = 0
    while (true) {
      const res = await listActionsApiV1ActionsGet({
        skip,
        limit: PAGE_LIMIT,
      })
      if (res.status !== 200) {
        throw new Error('Erro ao listar ações do ambiente atual')
      }
      const page = res.data.actions ?? []
      actions.push(...page.map(a => ({ name: a.name })))
      if (skip + page.length >= (res.data.total ?? 0)) break
      skip += PAGE_LIMIT
    }
  }

  const roles: HeimdallNamedInput[] = []
  {
    let skip = 0
    while (true) {
      const res = await listRolesApiV1RolesGet({ skip, limit: PAGE_LIMIT })
      if (res.status !== 200) {
        throw new Error('Erro ao listar papéis do ambiente atual')
      }
      const page = res.data.items ?? []
      roles.push(...page.map(r => ({ name: r.name })))
      const hasMore = res.data.has_more
      if (typeof hasMore === 'boolean') {
        if (!hasMore) break
      } else if (skip + page.length >= (res.data.total ?? 0)) {
        break
      }
      skip += PAGE_LIMIT
    }
  }

  const roleActions: Record<string, string[]> = {}
  await Promise.all(
    roles.map(async role => {
      const res = await listRoleActionsApiV1RolesRoleNameActionsGet(role.name)
      if (res.status !== 200) {
        throw new Error(`Erro ao listar actions do papel ${role.name}`)
      }
      const list = Array.isArray(res.data) ? res.data : []
      roleActions[role.name] = list.map(a => a.name).sort()
    })
  )

  const groupRoles: Record<string, string[]> = {}
  await Promise.all(
    groups.map(async group => {
      const res = await listGroupRolesApiV1RolesGroupsGroupNameRolesGet(
        group.name
      )
      if (res.status !== 200) {
        throw new Error(`Erro ao listar papéis do grupo ${group.name}`)
      }
      const list = Array.isArray(res.data) ? res.data : []
      groupRoles[group.name] = list.map(r => r.name).sort()
    })
  )

  return { mappings, actions, roles, roleActions, groups, groupRoles }
}

async function fetchRemoteSnapshot(
  baseUrl: string,
  jwt: string
): Promise<EnvSnapshot> {
  const mappingsRaw = await fetchRemoteJson<
    Array<{ path_pattern: string; method: string; action: string }>
  >(baseUrl, jwt, '/api/v1/mappings/list')

  const groupsRaw = await fetchRemoteJson<Array<{ name: string }>>(
    baseUrl,
    jwt,
    '/api/v1/groups/'
  )

  const actionsRaw = await fetchRemotePaginatedItems<{ name: string }>(
    baseUrl,
    jwt,
    '/api/v1/actions/',
    'actions'
  )

  const rolesRaw = await fetchRemotePaginatedItems<{ name: string }>(
    baseUrl,
    jwt,
    '/api/v1/roles/',
    'items'
  )

  const mappings: HeimdallMappingInput[] = (mappingsRaw ?? []).map(m => ({
    path_pattern: m.path_pattern,
    method: m.method,
    action: m.action,
  }))

  const groups: HeimdallNamedInput[] = (groupsRaw ?? []).map(g => ({
    name: g.name,
  }))
  const actions: HeimdallNamedInput[] = actionsRaw.map(a => ({ name: a.name }))
  const roles: HeimdallNamedInput[] = rolesRaw.map(r => ({ name: r.name }))

  const roleActions: Record<string, string[]> = {}
  await Promise.all(
    roles.map(async role => {
      const list = await fetchRemoteJson<Array<{ name: string }>>(
        baseUrl,
        jwt,
        `/api/v1/roles/${encodeURIComponent(role.name)}/actions`
      )
      roleActions[role.name] = (list ?? []).map(a => a.name).sort()
    })
  )

  const groupRoles: Record<string, string[]> = {}
  await Promise.all(
    groups.map(async group => {
      const list = await fetchRemoteJson<Array<{ name: string }>>(
        baseUrl,
        jwt,
        `/api/v1/roles/groups/${encodeURIComponent(group.name)}/roles`
      )
      groupRoles[group.name] = (list ?? []).map(r => r.name).sort()
    })
  )

  return { mappings, actions, roles, roleActions, groups, groupRoles }
}

function assignProdStaging(
  currentBaseUrl: string,
  compareBaseUrl: string,
  currentSnapshot: EnvSnapshot,
  otherSnapshot: EnvSnapshot
): {
  prodBaseUrl: string
  stagingBaseUrl: string
  prod: EnvSnapshot
  staging: EnvSnapshot
} {
  const currentLabel = labelForHeimdallBaseUrl(currentBaseUrl)
  const otherLabel = labelForHeimdallBaseUrl(compareBaseUrl)

  if (currentLabel === 'produção' && otherLabel === 'staging') {
    return {
      prodBaseUrl: currentBaseUrl,
      stagingBaseUrl: compareBaseUrl,
      prod: currentSnapshot,
      staging: otherSnapshot,
    }
  }

  if (currentLabel === 'staging' && otherLabel === 'produção') {
    return {
      prodBaseUrl: compareBaseUrl,
      stagingBaseUrl: currentBaseUrl,
      prod: otherSnapshot,
      staging: currentSnapshot,
    }
  }

  // Fallback: trata o "outro" como produção e o atual como staging
  // (caso típico: local/staging comparando com prod)
  return {
    prodBaseUrl:
      otherLabel === 'produção' ? compareBaseUrl : HEIMDALL_PROD_BASE_URL,
    stagingBaseUrl:
      currentLabel === 'staging' ? currentBaseUrl : HEIMDALL_STAGING_BASE_URL,
    prod: otherLabel === 'produção' ? otherSnapshot : currentSnapshot,
    staging: otherLabel === 'produção' ? currentSnapshot : otherSnapshot,
  }
}

export async function GET() {
  try {
    const currentBaseUrl = getCurrentHeimdallBaseUrl()
    return NextResponse.json({
      currentBaseUrl,
      currentLabel: labelForHeimdallBaseUrl(currentBaseUrl),
      suggestedCompareBaseUrl: suggestedCompareBaseUrl(currentBaseUrl),
      prodBaseUrl: HEIMDALL_PROD_BASE_URL,
      stagingBaseUrl: HEIMDALL_STAGING_BASE_URL,
    })
  } catch (error) {
    console.error('[API Heimdall] Erro ao obter config de comparação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompareRequestBody
    const compareJwt = body.compareJwt?.trim()
    const rawCompareUrl = body.compareBaseUrl?.trim()

    if (!compareJwt) {
      return NextResponse.json(
        { error: 'JWT do outro ambiente é obrigatório' },
        { status: 400 }
      )
    }

    if (!rawCompareUrl) {
      return NextResponse.json(
        { error: 'URL do outro ambiente é obrigatória' },
        { status: 400 }
      )
    }

    let compareBaseUrl: string
    try {
      compareBaseUrl = assertAllowedHeimdallCompareUrl(rawCompareUrl)
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'URL do outro ambiente inválida',
        },
        { status: 400 }
      )
    }

    const currentBaseUrl = getCurrentHeimdallBaseUrl()

    if (
      labelForHeimdallBaseUrl(currentBaseUrl) !== 'desconhecido' &&
      labelForHeimdallBaseUrl(currentBaseUrl) ===
        labelForHeimdallBaseUrl(compareBaseUrl)
    ) {
      return NextResponse.json(
        {
          error:
            'O outro ambiente deve ser diferente do ambiente atual (staging × produção)',
        },
        { status: 400 }
      )
    }

    const [currentSnapshot, otherSnapshot] = await Promise.all([
      fetchCurrentSnapshot(),
      fetchRemoteSnapshot(compareBaseUrl, compareJwt),
    ])

    const assigned = assignProdStaging(
      currentBaseUrl,
      compareBaseUrl,
      currentSnapshot,
      otherSnapshot
    )

    const result = buildHeimdallCompareResult({
      prodBaseUrl: assigned.prodBaseUrl,
      stagingBaseUrl: assigned.stagingBaseUrl,
      currentBaseUrl,
      compareBaseUrl,
      prod: assigned.prod,
      staging: assigned.staging,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(
      '[API Heimdall] Erro ao comparar ambientes:',
      error instanceof Error ? error.message : 'erro desconhecido'
    )
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao comparar ambientes',
      },
      { status: 500 }
    )
  }
}
