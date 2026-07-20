'use client'

import type {
  MappingCreateRequest,
  MappingDetailResponse,
  MappingResponse,
  MappingUpdateRequest,
} from '@/http-heimdall/models'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export function useHeimdallMappings(actionFilter?: string) {
  return useQuery({
    queryKey: heimdallKeys.mappings(actionFilter),
    queryFn: () => {
      const params = actionFilter
        ? `?action_filter=${encodeURIComponent(actionFilter)}`
        : ''
      return fetchHeimdallApi<MappingDetailResponse[]>(
        `/api/heimdall/mapeamentos${params}`
      )
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: MappingCreateRequest) =>
      fetchHeimdallApi<MappingDetailResponse>('/api/heimdall/mapeamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.mappingsRoot() })
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      toast.success('Mapeamento criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar mapeamento: ${error.message}`)
    },
  })
}

export function useUpdateMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MappingUpdateRequest }) =>
      fetchHeimdallApi<MappingDetailResponse>(
        `/api/heimdall/mapeamentos/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.mappingsRoot() })
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      toast.success('Mapeamento atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar mapeamento: ${error.message}`)
    },
  })
}

export function useDeleteMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      fetchHeimdallApi<void>(`/api/heimdall/mapeamentos/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: heimdallKeys.mappingsRoot() })
      queryClient.invalidateQueries({ queryKey: heimdallKeys.actionsRoot() })
      toast.success('Mapeamento excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir mapeamento: ${error.message}`)
    },
  })
}

/**
 * Resolve um endpoint (path + método) para a ação correspondente.
 * Implementado como mutation por ser disparado sob demanda pelo usuário.
 */
export function useResolveMapping() {
  return useMutation({
    mutationFn: ({ path, method }: { path: string; method: string }) =>
      fetchHeimdallApi<MappingResponse | null>(
        `/api/heimdall/mapeamentos/resolver?path=${encodeURIComponent(path)}&method=${encodeURIComponent(method)}`
      ),
    onError: (error: Error) => {
      toast.error(`Erro ao resolver mapeamento: ${error.message}`)
    },
  })
}
