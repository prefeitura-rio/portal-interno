'use client'

import { useAddParticipantsModal } from '@/hooks/use-add-participants-modal'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { AnimatedStep } from './animated-step'
import { FinishStep } from './finish-step'
import { ManualForm } from './manual-form'
import { ModalHeader } from './modal-header'
import { OptionsStep } from './option-step'
import { SpreadsheetForm } from './spreadsheet-form'
import type { AddParticipantsModalProps } from './types'

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
    handleFinish,
    handleBack,
    handleSelectMode,
    handleRetry,
    resetModal,
  } = useAddParticipantsModal({ onClose, onSuccess })

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen, resetModal])

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2
                     rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-6"
        >
          <ModalHeader step={step} onClose={onClose} />

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
                />
              </AnimatedStep>
            )}

            {step === 'spreadsheet' && (
              <AnimatedStep stepKey="spreadsheet">
                <SpreadsheetForm
                  courseId={courseId}
                  onBack={handleBack}
                  onFinish={handleFinish}
                  courseData={courseData}
                />
              </AnimatedStep>
            )}

            {step === 'finish' && (
              <FinishStep status={finishStatus} onRetry={handleRetry} />
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
