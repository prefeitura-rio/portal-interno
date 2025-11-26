import { useCallback, useEffect, useState } from 'react'
import type {
  FinishStatus,
  JobResult,
  ModalStep,
  UseAddParticipantsModalReturn,
} from '../app/(private)/(app)/gorio/components/add-participants/types'

interface UseAddParticipantsModalProps {
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}

/**
 * Custom hook to manage the state and transitions of the AddParticipantsModal
 */
export function useAddParticipantsModal({
  onClose,
  onSuccess,
}: UseAddParticipantsModalProps): UseAddParticipantsModalReturn {
  const [step, setStep] = useState<ModalStep>('options')
  const [finishStatus, setFinishStatus] = useState<FinishStatus>('loading')
  const [jobResult, setJobResult] = useState<JobResult | null>(null)

  const handleFinish = useCallback(
    async (success: boolean) => {
      setStep('finish')
      setFinishStatus('loading')

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setFinishStatus(success ? 'success' : 'error')
    },
    []
  )

  const handleBack = useCallback(() => {
    setStep('options')
  }, [])

  const handleSelectMode = useCallback(
    (mode: Extract<ModalStep, 'manual' | 'spreadsheet'>) => {
      setStep(mode)
    },
    []
  )

  const handleRetry = useCallback(() => {
    setStep('options')
    setFinishStatus('loading')
  }, [])

  const resetModal = useCallback(() => {
    setStep('options')
    setFinishStatus('loading')
    setJobResult(null)
  }, [])

  useEffect(() => {
    if (step === 'finish' && finishStatus === 'success') {
      const timer = setTimeout(async () => {
        if (onSuccess) {
          await onSuccess()
        }
        onClose()
        resetModal()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [step, finishStatus, onClose, resetModal, onSuccess])

  return {
    step,
    finishStatus,
    jobResult,
    handleFinish,
    handleBack,
    handleSelectMode,
    handleRetry,
    resetModal,
    setStep,
    setJobResult,
  }
}

