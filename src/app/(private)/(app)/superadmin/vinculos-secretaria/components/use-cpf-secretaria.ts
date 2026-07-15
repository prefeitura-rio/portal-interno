'use client'

import type { ModelsCPFSecretariaListResponse } from '@/http-rmi/models/modelsCPFSecretariaListResponse'
import type { ModelsCPFSecretariaResponse } from '@/http-rmi/models/modelsCPFSecretariaResponse'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { digitsOnlyCpf } from './cpf-input'

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body?.error && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // ignore JSON parse errors
  }
  return 'Ocorreu um erro inesperado.'
}

export function useCpfSecretaria() {
  const [mappings, setMappings] = useState<ModelsCPFSecretariaResponse[]>([])
  const [cpfConsultado, setCpfConsultado] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVinculos = useCallback(async (cpf: string) => {
    const normalized = digitsOnlyCpf(cpf)
    if (normalized.length !== 11) {
      const message = 'Informe um CPF válido com 11 dígitos.'
      setError(message)
      toast.error(message)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/cpf-secretaria/${normalized}`)
      if (!response.ok) {
        const message = await parseErrorMessage(response)
        setError(message)
        setMappings([])
        setCpfConsultado(null)
        toast.error(message)
        return null
      }

      const body = (await response.json()) as {
        data?: ModelsCPFSecretariaListResponse
      }
      const list = body.data?.mappings ?? []
      setMappings(list)
      setCpfConsultado(normalized)
      return list
    } catch {
      const message = 'Falha ao consultar vínculos.'
      setError(message)
      setMappings([])
      setCpfConsultado(null)
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addVinculo = useCallback(
    async (cpf: string, cdUa: string) => {
      const normalized = digitsOnlyCpf(cpf)
      if (normalized.length !== 11) {
        toast.error('Informe um CPF válido com 11 dígitos.')
        return false
      }
      if (!cdUa.trim()) {
        toast.error('Selecione uma secretaria.')
        return false
      }

      setIsMutating(true)
      try {
        const response = await fetch(
          `/api/admin/cpf-secretaria/${normalized}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cd_ua: cdUa }),
          }
        )

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          toast.error(
            response.status === 409
              ? message || 'Este vínculo já existe.'
              : message
          )
          return false
        }

        toast.success('Vínculo adicionado com sucesso.')
        await fetchVinculos(normalized)
        return true
      } catch {
        toast.error('Falha ao adicionar vínculo.')
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [fetchVinculos]
  )

  const removeVinculo = useCallback(
    async (cpf: string, cdUa: string) => {
      const normalized = digitsOnlyCpf(cpf)
      if (normalized.length !== 11 || !cdUa.trim()) {
        toast.error('Dados inválidos para remoção.')
        return false
      }

      setIsMutating(true)
      try {
        const response = await fetch(
          `/api/admin/cpf-secretaria/${normalized}/${encodeURIComponent(cdUa)}`,
          { method: 'DELETE' }
        )

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          toast.error(message)
          return false
        }

        toast.success('Vínculo removido com sucesso.')
        await fetchVinculos(normalized)
        return true
      } catch {
        toast.error('Falha ao remover vínculo.')
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [fetchVinculos]
  )

  return {
    mappings,
    cpfConsultado,
    isLoading,
    isMutating,
    error,
    fetchVinculos,
    addVinculo,
    removeVinculo,
  }
}
