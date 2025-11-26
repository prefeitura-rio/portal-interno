import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'

/**
 * Step showing processing animation while job is running
 */
export function ProcessingStep() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-foreground">
          Processando candidatos...
        </p>
        <p className="text-sm text-muted-foreground">
          Isso pode levar alguns segundos
        </p>
      </div>
    </motion.div>
  )
}
