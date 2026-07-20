'use client'

import type {
  AppRoutersRolesActionResponse,
  PaginatedResponseRoleResponse,
  RoleActionResponse,
  RoleCreateRequest,
  RoleResponse,
} from '@/http-heimdall/models'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

/** RoleResponse enriquecido com a contagem de ações agregada no BFF. */
export type RoleWithActionCount = RoleResponse & { action_count: number }

type PaginatedRolesWithActionCount = Omit<
  PaginatedResponseRoleResponse,
  'items'
> & {
  items: RoleWithActionCount[]
}

export function useHeimdallRoles({
  skip,
  limit,
}: {
  skip: number
  limit: number
}) {
  return useQuery({
    queryKey: heimdallKeys.roles(skip, limit),
    queryFn: () =>
      fetchHeimdallApi<PaginatedRolesWithActionCount>(
        `/api/heimdall/papeis?skip=${skip}&limit=${limit}&with_action_count=true`
      ),
    placeholderData: keepPreviousData,
  })
}

/**
 * Carrega todos os papéis paginando até o fim (para selects de atribuição).
 */
export function useAllHeimdallRoles(enabled = true) {
  return useQuery({
    queryKey: heimdallKeys.allRoles(),
    queryFn: async () => {
      const limit = 100
      const roles: RoleResponse[] = []
      let skip = 0

      // Safety cap de 50 páginas (5000 papéis)
      for (let i = 0; i < 50; i++) {
        const page = await fetchHeimdallApi<PaginatedResponseRoleResponse>(
          `/api/heimdall/papeis?skip=${skip}&limit=${limit}`
        )
        roles.push(...page.items)
        if (!page.has_more) break
        skip += limit
      }

      return roles
    },
    enabled,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: RoleCreateRequest) =>
      fetchHeimdallApi<RoleResponse>('/api/heimdall/papeis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.rolesRoot() })
      toast.success('Papel criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar papel: ${error.message}`)
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) =>
      fetchHeimdallApi<void>(
        `/api/heimdall/papeis/${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.rolesRoot() })
      toast.success('Papel excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir papel: ${error.message}`)
    },
  })
}

export function useRoleActions(roleName: string) {
  return useQuery({
    queryKey: heimdallKeys.roleActions(roleName),
    queryFn: () =>
      fetchHeimdallApi<AppRoutersRolesActionResponse[]>(
        `/api/heimdall/papeis/${encodeURIComponent(roleName)}/acoes`
      ),
    enabled: !!roleName,
  })
}

export function useAssignActionToRole(roleName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionName: string) =>
      fetchHeimdallApi<RoleActionResponse>(
        `/api/heimdall/papeis/${encodeURIComponent(roleName)}/acoes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action_name: actionName }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.roleActions(roleName),
      })
      toast.success('Ação atribuída ao papel!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir ação: ${error.message}`)
    },
  })
}

export function useRemoveActionFromRole(roleName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionName: string) =>
      fetchHeimdallApi<void>(
        `/api/heimdall/papeis/${encodeURIComponent(roleName)}/acoes/${encodeURIComponent(actionName)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.roleActions(roleName),
      })
      toast.success('Ação removida do papel!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover ação: ${error.message}`)
    },
  })
}
