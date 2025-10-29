import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { motion } from 'motion/react'
import type { FinishStepProps } from './types'

export function FinishStep({ status, onRetry }: FinishStepProps) {
  return (
    <motion.div
      key="finish"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="flex flex-col items-center justify-center gap-3 py-10"
    >
      {status === 'loading' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
          <p className="text-base font-medium text-foreground">
            Adicionando participantes...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <p className="text-base font-medium text-green-700">
            Participantes adicionados com sucesso!
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="h-12 w-12 text-red-600" />
          <p className="text-base font-medium text-red-700">
            Ocorreu um erro ao adicionar.
          </p>
          <Button onClick={onRetry} variant="destructive" className="mt-2">
            Tentar novamente
          </Button>
        </>
      )}
    </motion.div>
  )
}

