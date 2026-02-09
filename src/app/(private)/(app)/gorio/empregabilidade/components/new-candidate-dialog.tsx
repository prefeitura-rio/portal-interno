'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRef, useState } from 'react'
import type { InformacaoComplementar } from './informacoes-complementares-creator'
import {
  NewCandidateForm,
  type NewCandidateFormRef,
} from './new-candidate-form'

interface NewCandidateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vagaId: string
  vagaTitle: string
  informacoesComplementares: InformacaoComplementar[]
  onSuccess: () => void
}

export function NewCandidateDialog({
  open,
  onOpenChange,
  vagaId,
  vagaTitle,
  informacoesComplementares,
  onSuccess,
}: NewCandidateDialogProps) {
  const formRef = useRef<NewCandidateFormRef>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Debug: log complementary fields
  console.log('Informações complementares:', informacoesComplementares)

  const handleSubmit = () => {
    if (formRef.current) {
      setIsLoading(true)
      formRef.current.submit()
    }
  }

  const handleSuccess = () => {
    setIsLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  // Handle dialog open change (e.g., ESC key or overlay click)
  const handleDialogOpenChange = (newOpen: boolean) => {
    // Only allow closing if not loading
    if (!isLoading || !newOpen) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Candidato</DialogTitle>
          <DialogDescription>
            Inscrever um novo candidato manualmente na vaga &quot;{vagaTitle}
            &quot;
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <NewCandidateForm
            ref={formRef}
            vagaId={vagaId}
            informacoesComplementares={informacoesComplementares}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Inscrevendo...' : 'Inscrever Candidato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
