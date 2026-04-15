import { Button } from '@/components/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ModalHeaderProps } from './types'

const STEP_TITLES: Record<string, string> = {
  options: 'Adicionar Participantes',
  manual: 'Incluir participante manualmente',
  spreadsheet: 'Incluir via planilha',
  processing: 'Processando',
  results: 'Resultado da Importação',
  finish: '',
}

export function ModalHeader({ step, onClose }: ModalHeaderProps) {
  const title = STEP_TITLES[step] || 'Adicionar Participantes'
  const showCloseButton = step !== 'finish'

  return (
    <div className="flex justify-between items-center border-b pb-3">
      <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>

      {showCloseButton && (
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="w-5 h-5 text-zinc-500 hover:text-zinc-700" />
        </Button>
      )}
    </div>
  )
}

