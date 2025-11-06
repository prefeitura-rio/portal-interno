import { useCallback, useEffect, useState } from 'react'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionHistory } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsVersionHistory'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff'

interface UseServiceVersionsReturn {
  versions: GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionHistory | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getVersionDiff: (
    fromVersion: number,
    toVersion: number
  ) => Promise<GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff | null>
}

export function useServiceVersions(
  serviceId: string | null,
  page: number = 1,
  perPage: number = 50
): UseServiceVersionsReturn {
  const [versions, setVersions] =
    useState<GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionHistory | null>(
      null
    )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    if (!serviceId) {
      setLoading(false)
      setError(null)
      setVersions(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const searchParams = new URLSearchParams()
      if (page) {
        searchParams.append('page', page.toString())
      }
      if (perPage) {
        searchParams.append('per_page', perPage.toString())
      }

      const url = `/api/services/${serviceId}/versions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

      console.log('Fetching service versions from internal API:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch service versions')
      }

      setVersions(data.data)
    } catch (err) {
      console.error('Error fetching service versions:', err)
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar histórico de versões'
      )
      setVersions(null)
    } finally {
      setLoading(false)
    }
  }, [serviceId, page, perPage])

  const getVersionDiff = useCallback(
    async (
      fromVersion: number,
      toVersion: number
    ): Promise<GithubComPrefeituraRioAppBuscaSearchInternalModelsVersionDiff | null> => {
      if (!serviceId) return null

      try {
        const searchParams = new URLSearchParams({
          from_version: fromVersion.toString(),
          to_version: toVersion.toString(),
        })

        const url = `/api/services/${serviceId}/versions/compare?${searchParams.toString()}`

        console.log('Comparing service versions from internal API:', url)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to compare service versions')
        }

        return data.data
      } catch (err) {
        console.error('Error fetching version diff:', err)
        return null
      }
    },
    [serviceId]
  )

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  return {
    versions,
    loading,
    error,
    refetch: fetchVersions,
    getVersionDiff,
  }
}

