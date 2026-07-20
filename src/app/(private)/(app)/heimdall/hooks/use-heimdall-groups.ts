'use client'

import type {
  GroupCreateRequest,
  GroupMemberResponse,
  GroupResponse,
  MembershipResponse,
  RoleAssignmentResponse,
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

/** GroupResponse enriquecido com a contagem de membros agregada no BFF. */
export type GroupWithCount = GroupResponse & { member_count: number }

export function useHeimdallGroups(prefix?: string) {
  return useQuery({
    queryKey: heimdallKeys.groups(prefix),
    queryFn: () => {
      const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''
      return fetchHeimdallApi<GroupWithCount[]>(`/api/heimdall/grupos${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

/**
 * Busca um grupo pelo nome exato (a API não tem GET por nome;
 * usa a listagem com prefix e faz o match exato).
 */
export function useHeimdallGroup(name: string) {
  return useQuery({
    queryKey: [...heimdallKeys.groupsRoot(), 'byName', name] as const,
    queryFn: async () => {
      const groups = await fetchHeimdallApi<GroupWithCount[]>(
        `/api/heimdall/grupos?prefix=${encodeURIComponent(name)}`
      )
      return groups.find(group => group.name === name) ?? null
    },
    enabled: !!name,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: GroupCreateRequest) =>
      fetchHeimdallApi<GroupResponse>('/api/heimdall/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.groupsRoot() })
      toast.success('Grupo criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`)
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) =>
      fetchHeimdallApi<void>(
        `/api/heimdall/grupos/${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.groupsRoot() })
      toast.success('Grupo excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`)
    },
  })
}

export function useGroupMembers(groupName: string) {
  return useQuery({
    queryKey: heimdallKeys.groupMembers(groupName),
    queryFn: () =>
      fetchHeimdallApi<GroupMemberResponse[]>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/membros`
      ),
    enabled: !!groupName,
  })
}

export function useAddGroupMember(groupName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subject: string) =>
      fetchHeimdallApi<MembershipResponse>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/membros`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.groupMembers(groupName),
      })
      toast.success('Membro adicionado ao grupo!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar membro: ${error.message}`)
    },
  })
}

export function useRemoveGroupMember(groupName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subject: string) =>
      fetchHeimdallApi<void>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/membros/${subject}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.groupMembers(groupName),
      })
      toast.success('Membro removido do grupo!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover membro: ${error.message}`)
    },
  })
}

export function useGroupRoles(groupName: string) {
  return useQuery({
    queryKey: heimdallKeys.groupRoles(groupName),
    queryFn: () =>
      fetchHeimdallApi<RoleResponse[]>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/papeis`
      ),
    enabled: !!groupName,
  })
}

export function useAssignRoleToGroup(groupName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleName: string) =>
      fetchHeimdallApi<RoleAssignmentResponse>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/papeis`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_name: roleName }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.groupRoles(groupName),
      })
      toast.success('Papel atribuído ao grupo!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir papel: ${error.message}`)
    },
  })
}

export function useRemoveRoleFromGroup(groupName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roleName: string) =>
      fetchHeimdallApi<void>(
        `/api/heimdall/grupos/${encodeURIComponent(groupName)}/papeis/${encodeURIComponent(roleName)}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.groupRoles(groupName),
      })
      toast.success('Papel removido do grupo!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover papel: ${error.message}`)
    },
  })
}
