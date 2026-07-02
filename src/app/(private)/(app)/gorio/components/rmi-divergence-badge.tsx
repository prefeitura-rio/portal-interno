'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { hasEnrollmentRmiDivergence } from '@/lib/enrollment-rmi-consistency'
import type { Enrollment } from '@/types/course'
import { AlertTriangle } from 'lucide-react'

interface RmiDivergenceBadgeProps {
  enrollment: Enrollment
}

export function RmiDivergenceBadge({ enrollment }: RmiDivergenceBadgeProps) {
  if (!hasEnrollmentRmiDivergence(enrollment)) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        Dados informados diferem do Registro Municipal Integrado
      </TooltipContent>
    </Tooltip>
  )
}
