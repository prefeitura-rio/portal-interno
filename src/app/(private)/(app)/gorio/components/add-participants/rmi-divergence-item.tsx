'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { EnrollmentRmiDivergence } from '@/lib/enrollment-rmi-consistency'
import { mapRmiToEnrollmentUpdate } from '@/lib/enrollment-rmi-consistency'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface RmiDivergenceItemProps {
  divergence: EnrollmentRmiDivergence
  courseId: string
  onResolved: (enrollmentId: string) => void
}

export function RmiDivergenceItem({
  divergence,
  courseId,
  onResolved,
}: RmiDivergenceItemProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const { rmiData } = divergence

  const handleUseRmiData = async () => {
    setIsSaving(true)
    try {
      const updatePayload = mapRmiToEnrollmentUpdate(rmiData)

      const response = await fetch(
        `/api/enrollments/${courseId}/${divergence.enrollmentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar inscrição')
      }

      toast.success('Inscrição atualizada com dados do RMI')
      setIsResolved(true)
      onResolved(divergence.enrollmentId)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao atualizar inscrição. Tente novamente.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const formatCpf = (cpf: string) => {
    if (cpf.length !== 11) return cpf
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
  }

  if (isResolved) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 p-4">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            CPF {formatCpf(divergence.cpf)} — dados sincronizados com o RMI
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          CPF: {formatCpf(divergence.cpf)}
        </p>
        {divergence.line !== undefined && (
          <p className="text-xs text-muted-foreground">
            Linha {divergence.line} da planilha
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dados informados
          </p>
          {divergence.divergences.map(d => (
            <div key={d.field} className="text-sm">
              <span className="text-muted-foreground">{d.label}: </span>
              <span className="font-medium">{d.submitted || '—'}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            DADOS OFICIAIS DO RMI
          </p>
          {divergence.divergences.map(d => (
            <div key={d.field} className="text-sm">
              <span className="text-muted-foreground">{d.label}: </span>
              <span className="font-medium text-amber-800 dark:text-amber-300">
                {d.rmi || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          DADOS OFICIAIS RMI
        </p>
        <div className="grid grid-cols-2 gap-3">
          {divergence.divergences.some(d => d.field === 'name') && (
            <div className="col-span-2 space-y-1">
              <label
                htmlFor={`name-${divergence.enrollmentId}`}
                className="text-xs font-medium"
              >
                Nome
              </label>
              <Input
                id={`name-${divergence.enrollmentId}`}
                value={rmiData.name}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          )}
          {divergence.divergences.some(d => d.field === 'phone') && (
            <div className="space-y-1">
              <label
                htmlFor={`phone-${divergence.enrollmentId}`}
                className="text-xs font-medium"
              >
                Telefone
              </label>
              <Input
                id={`phone-${divergence.enrollmentId}`}
                value={rmiData.phone}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          )}
          {divergence.divergences.some(d => d.field === 'email') && (
            <div className="space-y-1">
              <label
                htmlFor={`email-${divergence.enrollmentId}`}
                className="text-xs font-medium"
              >
                E-mail
              </label>
              <Input
                id={`email-${divergence.enrollmentId}`}
                value={rmiData.email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleUseRmiData}
            disabled={isSaving}
          >
            {isSaving ? 'Aplicando...' : 'Usar dados do RMI'}
          </Button>
        </div>
      </div>
    </div>
  )
}
