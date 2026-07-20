'use client'

import type {
  ActionCreateRequest,
  ActionListResponse,
  ActionUpdateRequest,
  AppRoutersActionsActionResponse,
} from '@/http-heimdall/models'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export function useHeimdallActions({
  skip,
  limit,
}: {
  skip: number
  limit: number
}) {
  return useQuery({
    queryKey: heimdallKeys.actions(skip, limit),
    queryFn: () =>
      fetchHeimdallApi<ActionListResponse>(
        `/api/heimdall/acoes?skip=${skip}&limit=${limit}`
      ),
    placeholderData: keepPreviousData,
  })
}

/**
 * Carrega todas as ações paginando até o fim (para selects de atribuição).
 */
export function useAllHeimdallActions(enabled = true) {
  return useQuery({
    queryKey: heimdallKeys.allActions(),
    queryFn: async () => {
      const limit = 100
      const actions: AppRoutersActionsActionResponse[] = []
      let skip = 0

      // Safety cap de 50 páginas (5000 ações)
      for (let i = 0; i < 50; i++) {
        const page = await fetchHeimdallApi<ActionListResponse>(
          `/api/heimdall/acoes?skip=${skip}&limit=${limit}`
        )
        actions.push(...page.actions)
        if (actions.length >= page.total || page.actions.length === 0) break
        skip += limit
      }

      return actions
    },
    enabled,
  })
}

export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ActionCreateRequest) =>
      fetchHeimdallApi<AppRoutersActionsActionResponse>('/api/heimdall/acoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      toast.success('Ação criada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar ação: ${error.message}`)
    },
  })
}

export function useUpdateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ActionUpdateRequest }) =>
      fetchHeimdallApi<AppRoutersActionsActionResponse>(
        `/api/heimdall/acoes/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      toast.success('Ação atualizada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar ação: ${error.message}`)
    },
  })
}

export function useDeleteAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      fetchHeimdallApi<void>(`/api/heimdall/acoes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      // Excluir ação remove mapeamentos em cascata
      queryClient.invalidateQueries({ queryKey: heimdallKeys.mappingsRoot() })
      toast.success('Ação excluída com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir ação: ${error.message}`)
    },
  })
}
