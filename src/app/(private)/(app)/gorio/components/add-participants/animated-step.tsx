import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface AnimatedStepProps {
  children: ReactNode
  stepKey: string
}

export function AnimatedStep({ children, stepKey }: AnimatedStepProps) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  )
}

