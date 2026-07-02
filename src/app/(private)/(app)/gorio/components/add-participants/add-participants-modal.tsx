'use client'

import type { EnrollmentRmiDivergence } from '@/lib/enrollment-rmi-consistency'
import { useAddParticipantsModal } from '@/hooks/use-add-participants-modal'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { AnimatedStep } from './animated-step'
import { FinishStep } from './finish-step'
import { ManualForm } from './manual-form'
import { ModalHeader } from './modal-header'
import { OptionsStep } from './option-step'
import { ProcessingStep } from './processing-step'
import { ResultsStep } from './results-step'
import { RmiDivergenceStep } from './rmi-divergence-step'
import { SpreadsheetForm } from './spreadsheet-form'
import type { AddParticipantsModalProps, JobResult } from './types'

/**
 * Modal for adding participants to a course
 * Supports manual entry and spreadsheet upload
 */
export function AddParticipantsModal({
  isOpen,
  onClose,
  courseId,
  onSuccess,
  courseData,
}: AddParticipantsModalProps) {
  const {
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
    setRmiDivergences,
    handleRmiDivergenceContinue,
    handleClose,
  } = useAddParticipantsModal({ onClose, onSuccess })

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen, resetModal])

  const handleResultsClose = async () => {
    if (rmiDivergences.length > 0) {
      setStep('rmi-divergence')
      return
    }

    await handleClose()
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={open => {
        if (!open) void handleClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999]" />

        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2
                     rounded-xl bg-white dark:bg-zinc-900 shadow-xl z-[1000000]
                     max-h-[90vh] overflow-hidden flex flex-col p-6 space-y-6"
        >
          <ModalHeader
            step={step}
            onClose={() => {
              void handleClose()
            }}
          />

          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <AnimatePresence mode="wait">
              {step === 'options' && (
                <AnimatedStep stepKey="options">
                  <OptionsStep onSelect={handleSelectMode} />
                </AnimatedStep>
              )}

              {step === 'manual' && (
                <AnimatedStep stepKey="manual">
                  <ManualForm
                    courseId={courseId}
                    onBack={handleBack}
                    onFinish={handleFinish}
                    onRmiDivergence={setRmiDivergences}
                    courseData={courseData}
                  />
                </AnimatedStep>
              )}

              {step === 'spreadsheet' && (
                <AnimatedStep stepKey="spreadsheet">
                  <SpreadsheetForm
                    courseId={courseId}
                    onBack={handleBack}
                    onFinish={handleFinish}
                    onRmiDivergence={setRmiDivergences}
                    courseData={courseData}
                    onStartProcessing={() => setStep('processing')}
                    onProcessingComplete={(
                      result: JobResult,
                      divergences?: EnrollmentRmiDivergence[]
                    ) => {
                      setJobResult(result)
                      if (divergences && divergences.length > 0) {
                        setRmiDivergences(divergences)
                      }
                      setStep('results')
                    }}
                  />
                </AnimatedStep>
              )}

              {step === 'processing' && (
                <AnimatedStep stepKey="processing">
                  <ProcessingStep />
                </AnimatedStep>
              )}

              {step === 'results' && jobResult && (
                <AnimatedStep stepKey="results">
                  <ResultsStep
                    result={jobResult}
                    rmiDivergenceCount={rmiDivergences.length}
                    onClose={handleResultsClose}
                    onViewRmiDivergences={
                      rmiDivergences.length > 0
                        ? () => setStep('rmi-divergence')
                        : undefined
                    }
                  />
                </AnimatedStep>
              )}

              {step === 'rmi-divergence' && rmiDivergences.length > 0 && (
                <AnimatedStep stepKey="rmi-divergence">
                  <RmiDivergenceStep
                    divergences={rmiDivergences}
                    courseId={courseId}
                    onContinue={handleRmiDivergenceContinue}
                  />
                </AnimatedStep>
              )}

              {step === 'finish' && (
                <FinishStep status={finishStatus} onRetry={handleRetry} />
              )}
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
