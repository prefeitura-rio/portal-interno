'use client'

import type {
  ModelsImportResult,
  ModelsRedirectRule,
  ModelsResolveResult,
  ModelsRuleInput,
  ModelsStatusUpdateInput,
  ModelsStatusUpdateResult,
  V1EventsPage,
  V1HostsResponse,
  V1RulesPage,
} from '@/http-redirecionamentos/models'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  type RedirectsListParams,
  fetchRedirectsApi,
  redirectsKeys,
} from './redirects-api'

export function useRedirects(params: RedirectsListParams) {
  return useQuery({
    queryKey: redirectsKeys.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams()
      if (params.page !== undefined) {
        searchParams.set('page', String(params.page))
      }
      if (params.pageSize !== undefined) {
        searchParams.set('pageSize', String(params.pageSize))
      }
      if (params.host) {
        searchParams.set('host', params.host)
      }
      if (params.q) {
        searchParams.set('q', params.q)
      }
      if (params.enabled !== undefined) {
        searchParams.set('enabled', String(params.enabled))
      }
      if (params.status_code !== undefined) {
        searchParams.set('status_code', String(params.status_code))
      }
      const query = searchParams.toString()
      return fetchRedirectsApi<V1RulesPage>(
        query ? `/api/redirecionamentos?${query}` : '/api/redirecionamentos'
      )
    },
    placeholderData: keepPreviousData,
  })
}

export function useRedirectHosts() {
  return useQuery({
    queryKey: redirectsKeys.hosts(),
    queryFn: () =>
      fetchRedirectsApi<V1HostsResponse>('/api/redirecionamentos/hosts'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRedirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ModelsRuleInput) =>
      fetchRedirectsApi<ModelsRedirectRule>('/api/redirecionamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() })
      toast.success('Regra criada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar regra: ${error.message}`)
    },
  })
}

export function useUpdateRedirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ModelsRuleInput }) =>
      fetchRedirectsApi<ModelsRedirectRule>(`/api/redirecionamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: [...redirectsKeys.all, 'history', variables.id],
      })
      toast.success('Regra atualizada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar regra: ${error.message}`)
    },
  })
}

export function useDeleteRedirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      fetchRedirectsApi<void>(`/api/redirecionamentos/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() })
      toast.success('Regra excluída com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir regra: ${error.message}`)
    },
  })
}

export function useBulkUpdateRedirectStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ModelsStatusUpdateInput) =>
      fetchRedirectsApi<ModelsStatusUpdateResult>(
        '/api/redirecionamentos/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      ),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() })
      const count = data.updated ?? data.rules?.length ?? 0
      toast.success(`Status atualizado para ${count} regra(s)!`)
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`)
    },
  })
}

export function useImportRedirects() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dry_run', String(dryRun))

      return fetchRedirectsApi<ModelsImportResult>(
        `/api/redirecionamentos/importar?dry_run=${String(dryRun)}`,
        {
          method: 'POST',
          body: formData,
        }
      )
    },
    onSuccess: (_data, variables) => {
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() })
        toast.success('Regras importadas com sucesso!')
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`)
    },
  })
}

export function useResolveRedirect() {
  return useMutation({
    mutationFn: (url: string) =>
      fetchRedirectsApi<ModelsResolveResult>(
        `/api/redirecionamentos/testar?url=${encodeURIComponent(url)}`
      ),
    onError: (error: Error) => {
      toast.error(`Erro ao testar URL: ${error.message}`)
    },
  })
}

export function useRedirectHistory(
  ruleId: number | null,
  enabled = true,
  page = 1,
  pageSize = 50
) {
  return useQuery({
    queryKey: redirectsKeys.history(ruleId ?? 0, page, pageSize),
    queryFn: () =>
      fetchRedirectsApi<V1EventsPage>(
        `/api/redirecionamentos/${ruleId}/eventos?page=${page}&pageSize=${pageSize}`
      ),
    enabled: enabled && ruleId !== null && ruleId > 0,
  })
}
