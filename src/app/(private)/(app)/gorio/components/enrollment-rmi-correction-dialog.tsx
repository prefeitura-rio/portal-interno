'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getEnrollmentRmiDivergence } from '@/lib/enrollment-rmi-consistency'
import type { Enrollment } from '@/types/course'
import { RmiDivergenceItem } from './add-participants/rmi-divergence-item'

interface EnrollmentRmiCorrectionDialogProps {
  enrollment: Enrollment | null
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolved: () => void
}

export function EnrollmentRmiCorrectionDialog({
  enrollment,
  courseId,
  open,
  onOpenChange,
  onResolved,
}: EnrollmentRmiCorrectionDialogProps) {
  if (!enrollment) return null

  const divergence = getEnrollmentRmiDivergence(enrollment)
  if (!divergence) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corrigir divergências com o RMI</DialogTitle>
          <DialogDescription>
            Os dados informados nesta inscrição diferem do Registro Municipal
            Integrado. Revise e sincronize os campos abaixo.
          </DialogDescription>
        </DialogHeader>

        <RmiDivergenceItem
          divergence={divergence}
          courseId={courseId}
          onResolved={() => {
            onResolved()
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
