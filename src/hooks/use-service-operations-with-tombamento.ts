import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useServiceOperations } from './use-service-operations'
import { useTombamentos } from './use-tombamentos'

export function useServiceOperationsWithTombamento() {
  const {
    publishService,
    unpublishService,
    deleteService,
    sendToApproval,
    sendToEdition,
    loading,
  } = useServiceOperations()
  const { createTombamento } = useTombamentos()
  const [showTombamentoModal, setShowTombamentoModal] = useState(false)
  const [selectedServiceForTombamento, setSelectedServiceForTombamento] =
    useState<{
      id: string
      title: string
    } | null>(null)

  const handlePublishWithTombamento = useCallback(
    async (serviceId: string, serviceTitle: string) => {
      try {
        await publishService(serviceId)
        toast.success('Serviço publicado com sucesso!')

        // Show tombamento modal after successful publication
        setSelectedServiceForTombamento({ id: serviceId, title: serviceTitle })
        setShowTombamentoModal(true)
      } catch (error) {
        console.error('Error publishing service:', error)
        toast.error('Erro ao publicar serviço. Tente novamente.')
        throw error
      }
    },
    [publishService]
  )

  const handleTombamentoSuccess = useCallback(() => {
    setShowTombamentoModal(false)
    setSelectedServiceForTombamento(null)
    toast.success('Tombamento criado com sucesso!')
  }, [])

  const handleTombamentoCancel = useCallback(() => {
    setShowTombamentoModal(false)
    setSelectedServiceForTombamento(null)
  }, [])

  return {
    // Original operations
    publishService: handlePublishWithTombamento,
    unpublishService,
    deleteService,
    sendToApproval,
    sendToEdition,
    loading,

    // Tombamento modal state
    showTombamentoModal,
    selectedServiceForTombamento,
    handleTombamentoSuccess,
    handleTombamentoCancel,
  }
}
