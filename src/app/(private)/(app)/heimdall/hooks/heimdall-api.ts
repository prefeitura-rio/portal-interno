/**
 * Helpers compartilhados dos hooks do módulo Heimdall admin.
 * Todas as chamadas passam pelo BFF em /api/heimdall/* (o client Orval é server-only).
 */

export const heimdallKeys = {
  all: ['heimdall'] as const,
  users: (skip: number, limit: number) =>
    [...heimdallKeys.all, 'users', { skip, limit }] as const,
  userByCpf: (cpf: string) => [...heimdallKeys.all, 'users', cpf] as const,
  groups: (prefix?: string) =>
    [...heimdallKeys.all, 'groups', { prefix: prefix ?? '' }] as const,
  groupsRoot: () => [...heimdallKeys.all, 'groups'] as const,
  groupMembers: (name: string) =>
    [...heimdallKeys.all, 'groups', name, 'members'] as const,
  groupRoles: (name: string) =>
    [...heimdallKeys.all, 'groups', name, 'roles'] as const,
  roles: (skip: number, limit: number) =>
    [...heimdallKeys.all, 'roles', { skip, limit }] as const,
  rolesRoot: () => [...heimdallKeys.all, 'roles'] as const,
  allRoles: () => [...heimdallKeys.all, 'roles', 'all'] as const,
  roleActions: (roleName: string) =>
    [...heimdallKeys.all, 'roles', roleName, 'actions'] as const,
  actions: (skip: number, limit: number) =>
    [...heimdallKeys.all, 'actions', { skip, limit }] as const,
  actionsRoot: () => [...heimdallKeys.all, 'actions'] as const,
  allActions: () => [...heimdallKeys.all, 'actions', 'all'] as const,
  mappings: (actionFilter?: string) =>
    [
      ...heimdallKeys.all,
      'mappings',
      { actionFilter: actionFilter ?? '' },
    ] as const,
  mappingsRoot: () => [...heimdallKeys.all, 'mappings'] as const,
  dashboardStats: () => [...heimdallKeys.all, 'dashboard', 'stats'] as const,
  healthz: () => [...heimdallKeys.all, 'health', 'healthz'] as const,
  readyz: () => [...heimdallKeys.all, 'health', 'readyz'] as const,
  cerbosPolicyTemplate: () =>
    [...heimdallKeys.all, 'health', 'cerbos-policy-template'] as const,
}

export async function fetchHeimdallApi<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init)

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') {
        message = body.error
      }
      const detail = body?.details?.detail
      if (typeof detail === 'string') {
        message = `${message}: ${detail}`
      }
    } catch {
      // corpo não-JSON: mantém a mensagem genérica
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
