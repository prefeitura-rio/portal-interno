import { useCallback, useEffect, useState } from 'react'

export type CandidatoStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface EtapaVaga {
  id: string
  titulo?: string
  descricao?: string
  ordem: number
}

export interface VagaCandidato {
  id: string
  titulo?: string
  etapas?: EtapaVaga[]
}

/** Snapshot do currículo do candidato no momento da candidatura (estrutura do backend). */
export interface CurriculoSnapshot {
  formacoes?: Array<{
    nome_instituicao?: string
    nome_curso?: string
    status?: string
    ano_conclusao?: string
    escolaridade?: { descricao?: string }
  }>
  idiomas?: Array<{
    idioma?: { descricao?: string }
    nivel?: { descricao?: string }
  }>
  cursos_complementares?: Array<{
    nome_instituicao?: string
    nome_curso?: string
    ano_conclusao?: string
  }>
  experiencias?: Array<{
    cargo?: string
    empresa?: string
    eh_trabalho_atual?: boolean
    descricao_atividades?: string
    tempo_experiencia_meses?: number
    experiencia_comprovada_ct?: boolean
  }>
  conquistas?: Array<{
    titulo?: string
    descricao?: string
    tipo_conquista?: { descricao?: string }
  }>
  situacao_interesses?: {
    situacao?: { descricao?: string }
    disponibilidade?: { descricao?: string }
    tempo_procurando_emprego?: string
  }
}

export interface Candidato {
  id: string
  candidateName: string
  cpf: string
  email: string
  phone?: string
  enrollmentDate: string
  status: CandidatoStatus
  /** Raw backend status (e.g. vaga_congelada, vaga_descontinuada) for display when status is cancelled */
  statusBackend?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  /** ID da etapa atual do processo seletivo (null = ainda não definida) */
  currentEtapaId?: string | null
  /** Dados da vaga vinculada (com etapas quando a vaga possui processo por etapas) */
  vaga?: VagaCandidato
  /** Snapshot do currículo no momento da candidatura */
  curriculo_snapshot?: CurriculoSnapshot
  customFields?: Array<{
    id: string
    title: string
    field_type: string
    value: string
    options?: Array<{
      id: string
      value: string
    }>
  }>
}

export interface CandidatoSummary {
  total: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  cancelledCount: number
}

export interface CandidatoFilters {
  status?: CandidatoStatus[]
  search?: string
  etapa_id?: string
}

interface UseCandidatosOptions {
  empregabilidadeId: string
  page?: number
  perPage?: number
  filters?: CandidatoFilters
  autoFetch?: boolean
}

interface UseCandidatosReturn {
  candidatos: Candidato[]
  summary: CandidatoSummary | null
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCandidatoStatus: (
    candidatoId: string,
    status: CandidatoStatus
  ) => Promise<Candidato | null>
  updateCandidatoEtapa: (
    candidatoId: string,
    idEtapa: string | null
  ) => Promise<Candidato | null>
  updateMultipleCandidatoStatuses: (
    cpfs: string[],
    status: CandidatoStatus
  ) => Promise<boolean>
  updateMultipleCandidatoEtapas: (
    cpfs: string[],
    idEtapa: string
  ) => Promise<boolean>
}

export function useCandidatos({
  empregabilidadeId,
  page = 1,
  perPage = 10,
  filters,
  autoFetch = true,
}: UseCandidatosOptions): UseCandidatosReturn {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [summary, setSummary] = useState<CandidatoSummary | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidatos = useCallback(async () => {
    if (!empregabilidadeId) return

    setLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        id_vaga: empregabilidadeId,
      })

      // Add status filter if present (API accepts single status; send first selected)
      if (filters?.status && filters.status.length > 0) {
        params.append('status', filters.status[0])
      }

      // Add search filter if present
      if (filters?.search) {
        params.append('search', filters.search)
      }

      // Add etapa filter if present (single UUID)
      if (filters?.etapa_id) {
        params.append('etapa_id', filters.etapa_id)
      }

      console.log('Fetching candidatos with params:', params.toString())

      const response = await fetch(
        `/api/empregabilidade/candidaturas?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch candidatos: ${response.statusText}`)
      }

      const data = await response.json()

      console.log('useCandidatos - received data:', data)
      console.log('useCandidatos - candidatos count:', data.candidatos?.length)
      console.log('useCandidatos - pagination:', data.pagination)

      setCandidatos(data.candidatos || [])
      setSummary(data.summary || null)
      setPagination(data.pagination || null)
    } catch (err) {
      console.error('Error fetching candidatos:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch candidatos'
      )
      setCandidatos([])
      setSummary(null)
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [empregabilidadeId, page, perPage, filters])

  useEffect(() => {
    if (autoFetch) {
      fetchCandidatos()
    }
  }, [fetchCandidatos, autoFetch])

  const updateCandidatoStatus = useCallback(
    async (
      candidatoId: string,
      status: CandidatoStatus
    ): Promise<Candidato | null> => {
      try {
        let endpoint = ''

        // Map to specific endpoints
        if (status === 'approved') {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/approve`
        } else if (status === 'rejected') {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/reject`
        } else {
          endpoint = `/api/empregabilidade/candidaturas/${candidatoId}/status`
        }

        console.log('Updating candidato status:', {
          candidatoId,
          status,
          endpoint,
        })

        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:
            status !== 'approved' && status !== 'rejected'
              ? JSON.stringify({ status })
              : undefined,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.error || 'Failed to update candidato status'
          )
        }

        // Refetch to get updated data
        await fetchCandidatos()

        const data = await response.json()
        return data.candidatura || null
      } catch (err) {
        console.error('Error updating candidato status:', err)
        throw err
      }
    },
    [fetchCandidatos]
  )

  const updateCandidatoEtapa = useCallback(
    async (
      candidatoId: string,
      idEtapa: string | null
    ): Promise<Candidato | null> => {
      try {
        const response = await fetch(
          `/api/empregabilidade/candidaturas/${candidatoId}/etapa`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_etapa_atual: idEtapa }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.error || 'Falha ao atualizar etapa da candidatura'
          )
        }

        await fetchCandidatos()
        const data = await response.json()
        return data.candidatura || null
      } catch (err) {
        console.error('Error updating candidato etapa:', err)
        throw err
      }
    },
    [fetchCandidatos]
  )

  const updateMultipleCandidatoStatuses = useCallback(
    async (cpfs: string[], status: CandidatoStatus): Promise<boolean> => {
      try {
        if (cpfs.length === 0) return true

        const response = await fetch(
          '/api/empregabilidade/candidaturas/bulk-status',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cpfs,
              status,
              id_vaga: empregabilidadeId,
            }),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Falha ao atualizar status em lote')
        }

        await fetchCandidatos()
        return true
      } catch (err) {
        console.error('Error updating multiple candidato statuses:', err)
        throw err
      }
    },
    [empregabilidadeId, fetchCandidatos]
  )

  const updateMultipleCandidatoEtapas = useCallback(
    async (cpfs: string[], idEtapa: string): Promise<boolean> => {
      try {
        if (cpfs.length === 0) return true

        const response = await fetch(
          '/api/empregabilidade/candidaturas/bulk-etapa',
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cpfs,
              id_etapa: idEtapa,
              id_vaga: empregabilidadeId,
            }),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Falha ao atualizar etapa em lote')
        }

        await fetchCandidatos()
        return true
      } catch (err) {
        console.error('Error updating multiple candidato etapas:', err)
        throw err
      }
    },
    [empregabilidadeId, fetchCandidatos]
  )

  return {
    candidatos,
    summary,
    pagination,
    loading,
    error,
    refetch: fetchCandidatos,
    updateCandidatoStatus,
    updateCandidatoEtapa,
    updateMultipleCandidatoStatuses,
    updateMultipleCandidatoEtapas,
  }
}
