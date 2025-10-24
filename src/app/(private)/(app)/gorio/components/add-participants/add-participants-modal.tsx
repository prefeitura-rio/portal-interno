'use client'

import { Button } from '@/components/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ManualForm } from './manual-form'
import { OptionsStep } from './option-step'
import { SpreadsheetForm } from './spreadsheet-form'

interface AddParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseType?: 'presencial' | 'online'
}

export function AddParticipantsModal({ isOpen, onClose, courseId, courseType }: AddParticipantsModalProps) {
  const [mode, setMode] = useState<'options' | 'manual' | 'spreadsheet' | 'finish'>('options')
  const [finishStatus, setFinishStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [simulateSuccess, setSimulateSuccess] = useState(true)

  const handleFinish = (success: boolean) => {
    setMode('finish')
    setFinishStatus('loading')
    setSimulateSuccess(success)

    // Simula processamento (loading -> success/erro)
    setTimeout(() => {
      setFinishStatus(success ? 'success' : 'error')
    }, 2500)
  }

  // Fecha automaticamente após sucesso
  useEffect(() => {
    if (mode === 'finish' && finishStatus === 'success') {
      const timer = setTimeout(() => {
        onClose()
        setMode('options')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [finishStatus, mode, onClose])

  // if (courseType !== 'presencial') return null

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2
                     rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-6"
        >
          <div className="flex justify-between items-center border-b pb-3">
            <Dialog.Title className="text-lg font-semibold">
              {mode === 'manual'
                ? 'Incluir participante manualmente'
                : mode === 'spreadsheet'
                ? 'Incluir via planilha'
                : mode === 'finish'
                ? ''
                : 'Adicionar Participantes'}
            </Dialog.Title>

            {mode !== 'finish' && (
              <Button onClick={onClose} variant="ghost" size="icon">
                <X className="w-5 h-5 text-zinc-500 hover:text-zinc-700" />
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {mode === 'options' && (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <OptionsStep onSelect={setMode} />
              </motion.div>
            )}

            {mode === 'manual' && (
              <motion.div
                key="manual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ManualForm courseId={courseId} onBack={() => setMode('options')} onFinish={handleFinish} />
              </motion.div>
            )}

            {mode === 'spreadsheet' && (
              <motion.div
                key="spreadsheet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SpreadsheetForm onBack={() => setMode('options')} onFinish={handleFinish} />
              </motion.div>
            )}

            {mode === 'finish' && (
              <motion.div
                key="finish"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="flex flex-col items-center justify-center gap-3 py-10"
              >
                {finishStatus === 'loading' && (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
                    <p className="text-base font-medium text-foreground">
                      Adicionando participantes...
                    </p>
                  </>
                )}

                {finishStatus === 'success' && (
                  <>
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <p className="text-base font-medium text-green-700">
                      Participantes adicionados com sucesso!
                    </p>
                  </>
                )}

                {finishStatus === 'error' && (
                  <>
                    <XCircle className="h-12 w-12 text-red-600" />
                    <p className="text-base font-medium text-red-700">
                      Ocorreu um erro ao adicionar.
                    </p>
                    <Button
                      onClick={() => {
                        setMode('options')
                      }}
                      variant="destructive"
                      className="mt-2"
                    >
                      Tentar novamente
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
