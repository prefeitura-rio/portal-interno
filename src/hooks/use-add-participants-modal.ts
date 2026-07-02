import type { EnrollmentRmiDivergence } from '@/lib/enrollment-rmi-consistency'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [rmiDivergences, setRmiDivergences] = useState<
    EnrollmentRmiDivergence[]
  >([])
  const skipFinishAutoClose = useRef(false)
  const rmiDivergenceRefetchedRef = useRef(false)

  const resetModal = useCallback(() => {
    setStep('options')
    setFinishStatus('loading')
    setJobResult(null)
    setRmiDivergences([])
    skipFinishAutoClose.current = false
    rmiDivergenceRefetchedRef.current = false
  }, [])

  const shouldRefetchOnClose = useCallback((): boolean => {
    return (
      step === 'rmi-divergence' ||
      step === 'results' ||
      (step === 'finish' && finishStatus === 'success')
    )
  }, [finishStatus, step])

  const handleClose = useCallback(async () => {
    if (shouldRefetchOnClose() && onSuccess) {
      await onSuccess()
    }
    onClose()
    resetModal()
  }, [onClose, onSuccess, resetModal, shouldRefetchOnClose])

  const handleFinish = useCallback(async (success: boolean) => {
    setStep('finish')
    setFinishStatus('loading')

    await new Promise(resolve => setTimeout(resolve, 1500))

    setFinishStatus(success ? 'success' : 'error')
  }, [])

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
    skipFinishAutoClose.current = false
  }, [])

  const handleRmiDivergenceContinue = useCallback(async () => {
    if (onSuccess) {
      await onSuccess()
    }
    onClose()
    resetModal()
  }, [onClose, onSuccess, resetModal])

  useEffect(() => {
    if (step === 'finish' && finishStatus === 'success') {
      const timer = setTimeout(async () => {
        if (skipFinishAutoClose.current) {
          setStep('rmi-divergence')
          skipFinishAutoClose.current = false
          return
        }

        if (onSuccess) {
          await onSuccess()
        }
        onClose()
        resetModal()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [step, finishStatus, onClose, resetModal, onSuccess])

  useEffect(() => {
    if (
      step === 'rmi-divergence' &&
      rmiDivergences.length > 0 &&
      !rmiDivergenceRefetchedRef.current
    ) {
      rmiDivergenceRefetchedRef.current = true
      void onSuccess?.()
    }
  }, [onSuccess, rmiDivergences.length, step])

  const setRmiDivergencesWithSkip = useCallback(
    (divergences: EnrollmentRmiDivergence[]) => {
      setRmiDivergences(divergences)
      if (divergences.length > 0) {
        skipFinishAutoClose.current = true
      }
    },
    []
  )

  return {
    step,
    finishStatus,
    jobResult,
    rmiDivergences,
    handleFinish,
    handleBack,
    handleSelectMode,
    handleRetry,
    resetModal,
    setStep,
    setJobResult,
    setRmiDivergences: setRmiDivergencesWithSkip,
    handleRmiDivergenceContinue,
    handleClose,
  }
}
