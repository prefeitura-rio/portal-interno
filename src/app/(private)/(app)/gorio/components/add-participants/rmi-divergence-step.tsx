'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { RmiDivergenceItem } from './rmi-divergence-item'
import type { RmiDivergenceStepProps } from './types'

export function RmiDivergenceStep({
  divergences: initialDivergences,
  courseId,
  onContinue,
}: RmiDivergenceStepProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())

  const handleResolved = (enrollmentId: string) => {
    setResolvedIds(prev => new Set(prev).add(enrollmentId))
  }

  const pendingCount = initialDivergences.length - resolvedIds.size

  return (
    <div className="space-y-4 py-2">
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Os dados preenchidos diferem dos dados do Registro Municipal
              Integrado
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingCount === 1
                ? '1 participante possui informações divergentes. A inscrição foi criada, mas os dados oficiais do RMI prevalecem na exibição.'
                : `${pendingCount} participantes possuem informações divergentes. As inscrições foram criadas, mas os dados oficiais do RMI prevalecem na exibição.`}
            </p>
          </div>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
        {initialDivergences.map(divergence => (
          <RmiDivergenceItem
            key={divergence.enrollmentId}
            divergence={divergence}
            courseId={courseId}
            onResolved={handleResolved}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="secondary" type="button" onClick={onContinue}>
          {pendingCount > 0
            ? `Continuar sem alterar (${pendingCount} pendente${pendingCount !== 1 ? 's' : ''})`
            : 'Concluir'}
        </Button>
      </div>
    </div>
  )
}
