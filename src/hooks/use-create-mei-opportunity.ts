import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export type BackendMEIOpportunityData = {
  orgao_id: number | null
  cnae_id: number | null
  cnae?: {
    id: number
    codigo: string
    ocupacao: string
    servico: string
  }
  titulo?: string
  descricao_servico?: string
  outras_informacoes?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  forma_pagamento?: string
  prazo_pagamento?: string
  data_expiracao?: string
  data_limite_execucao?: string | null
  gallery_images?: string[]
  cover_image?: string | null
  status?: 'active' | 'draft' | 'canceled' | 'closed'
}

type OperationOptions = {
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
  redirectPath?: string
}

export function useMEIOpportunity() {
  const router = useRouter()

  const createOpportunity = async (
    data: BackendMEIOpportunityData,
    options?: OperationOptions
  ) => {
    try {
      console.log('Creating MEI opportunity:', data)

      const response = await fetch('/api/oportunidades-mei', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create MEI opportunity')
      }

      const result = await response.json()
      console.log('MEI opportunity created successfully:', result)

      // Show success toast
      toast.success('Oportunidade MEI criada com sucesso!')

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess(result)
      }

      // Redirect
      router.push(options?.redirectPath || '/gorio/oportunidades-mei')
      router.refresh()

      return result
    } catch (error) {
      console.error('Error creating MEI opportunity:', error)

      // Call custom error handler if provided
      if (options?.onError && error instanceof Error) {
        options.onError(error)
      }

      toast.error('Erro ao criar oportunidade MEI', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })

      throw error
    }
  }

  const createDraft = async (
    data: BackendMEIOpportunityData,
    options?: OperationOptions
  ) => {
    try {
      console.log('Creating draft MEI opportunity:', data)

      const response = await fetch('/api/oportunidades-mei?draft=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || 'Failed to create draft MEI opportunity'
        )
      }

      const result = await response.json()
      console.log('Draft MEI opportunity created successfully:', result)

      // Show success toast
      toast.success('Rascunho salvo com sucesso!')

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess(result)
      }

      // Redirect
      router.push(options?.redirectPath || '/gorio/oportunidades-mei?tab=draft')
      router.refresh()

      return result
    } catch (error) {
      console.error('Error creating draft MEI opportunity:', error)

      // Call custom error handler if provided
      if (options?.onError && error instanceof Error) {
        options.onError(error)
      }

      toast.error('Erro ao salvar rascunho', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })

      throw error
    }
  }

  const updateOpportunity = async (
    id: number,
    data: BackendMEIOpportunityData,
    options?: OperationOptions
  ) => {
    try {
      console.log(`Updating MEI opportunity ${id}:`, data)

      const response = await fetch(`/api/oportunidades-mei/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update MEI opportunity')
      }

      const result = await response.json()
      console.log('MEI opportunity updated successfully:', result)

      // Show success toast
      toast.success('Oportunidade MEI atualizada com sucesso!')

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess(result)
      }

      // Redirect
      if (options?.redirectPath) {
        router.push(options.redirectPath)
      }
      router.refresh()

      return result
    } catch (error) {
      console.error('Error updating MEI opportunity:', error)

      // Call custom error handler if provided
      if (options?.onError && error instanceof Error) {
        options.onError(error)
      }

      toast.error('Erro ao atualizar oportunidade MEI', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })

      throw error
    }
  }

  const deleteOpportunity = async (id: number, options?: OperationOptions) => {
    try {
      console.log(`Deleting MEI opportunity ${id}`)

      const response = await fetch(`/api/oportunidades-mei/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete MEI opportunity')
      }

      const result = await response.json()
      console.log('MEI opportunity deleted successfully:', result)

      // Show success toast
      toast.success('Oportunidade MEI excluída com sucesso!')

      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess(result)
      }

      // Redirect
      router.push(options?.redirectPath || '/gorio/oportunidades-mei')
      router.refresh()

      return result
    } catch (error) {
      console.error('Error deleting MEI opportunity:', error)

      // Call custom error handler if provided
      if (options?.onError && error instanceof Error) {
        options.onError(error)
      }

      toast.error('Erro ao excluir oportunidade MEI', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })

      throw error
    }
  }

  return {
    createOpportunity,
    createDraft,
    updateOpportunity,
    deleteOpportunity,
  }
}

// Alias for backward compatibility
export const useCreateMEIOpportunity = useMEIOpportunity
