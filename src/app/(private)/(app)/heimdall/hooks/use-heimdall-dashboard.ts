'use client'

import type {
  ActionListResponse,
  GroupResponse,
  PaginatedResponseRoleResponse,
  PaginatedResponseUserResponse,
} from '@/http-heimdall/models'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHeimdallApi, heimdallKeys } from './heimdall-api'

export interface HeimdallDashboardStats {
  users: number
  groups: number
  roles: number
  actions: number
}

export interface HeimdallHealthStatus {
  status: string
  service?: string
  timestamp?: string
  dependencies?: Record<string, string>
  checks?: Record<string, boolean>
  errors?: string[]
  [key: string]: unknown
}

async function fetchDashboardStats(): Promise<HeimdallDashboardStats> {
  const [usersData, groupsData, rolesData, actionsData] = await Promise.all([
    fetchHeimdallApi<PaginatedResponseUserResponse>(
      '/api/heimdall/usuarios?skip=0&limit=1'
    ).catch(() => ({ total: 0 }) as PaginatedResponseUserResponse),
    fetchHeimdallApi<GroupResponse[]>('/api/heimdall/grupos').catch(() => []),
    fetchHeimdallApi<PaginatedResponseRoleResponse>(
      '/api/heimdall/papeis?skip=0&limit=1'
    ).catch(() => ({ total: 0 }) as PaginatedResponseRoleResponse),
    fetchHeimdallApi<ActionListResponse>(
      '/api/heimdall/acoes?skip=0&limit=1'
    ).catch(() => ({ total: 0 }) as ActionListResponse),
  ])

  return {
    users: usersData.total ?? 0,
    groups: Array.isArray(groupsData) ? groupsData.length : 0,
    roles: rolesData.total ?? 0,
    actions: actionsData.total ?? 0,
  }
}

export function useHeimdallDashboardStats() {
  return useQuery({
    queryKey: heimdallKeys.dashboardStats(),
    queryFn: fetchDashboardStats,
  })
}

export function useHeimdallHealthz() {
  return useQuery({
    queryKey: heimdallKeys.healthz(),
    queryFn: () =>
      fetchHeimdallApi<HeimdallHealthStatus>('/api/heimdall/healthz'),
    retry: false,
  })
}

export function useRefreshHeimdallDashboard() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: heimdallKeys.dashboardStats(),
      }),
      queryClient.invalidateQueries({ queryKey: heimdallKeys.healthz() }),
    ])
}
