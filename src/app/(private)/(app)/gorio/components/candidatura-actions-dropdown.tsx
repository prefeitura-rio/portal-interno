'use client'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CheckCircle, Clock, MoreVertical } from 'lucide-react'
import * as React from 'react'

interface CandidaturaActionsDropdownProps {
  canApprove: boolean
  isPending: boolean
  isApproved: boolean
  /** Bloqueia o dropdown inteiro (candidato recusado ou aprovado) */
  isBlocked?: boolean
  onSetPending: () => void
  onApprove: () => void
}

type PendingAction = 'approve' | 'set_pending' | null

const CONFIRM_CONFIG = {
  approve: {
    title: 'Atenção!',
    description:
      'Aprovar um candidato é uma ação definitiva. Deseja continuar?',
    confirmText: 'Sim',
    cancelText: 'Não',
    variant: 'default' as const,
  },
  set_pending: {
    title: 'Atenção!',
    description:
      'Definir como pendente irá reverter o status do candidato. Deseja continuar?',
    confirmText: 'Sim',
    cancelText: 'Não',
    variant: 'default' as const,
  },
}

export function CandidaturaActionsDropdown({
  canApprove,
  isPending,
  isApproved,
  isBlocked = false,
  onSetPending,
  onApprove,
}: CandidaturaActionsDropdownProps) {
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null)

  function handleConfirm() {
    if (pendingAction === 'approve') onApprove()
    else if (pendingAction === 'set_pending') onSetPending()
    setPendingAction(null)
  }

  const config = pendingAction ? CONFIRM_CONFIG[pendingAction] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isBlocked}
          className="flex h-10 items-center gap-1.5 rounded-[10px] border border-[#E5E5E5] bg-white px-3 text-sm font-medium text-foreground ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          aria-label="Mais ações"
        >
          <MoreVertical className="h-4 w-4" />
          Mais ações
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => setPendingAction('set_pending')}
          >
            <Clock className="h-4 w-4" />
            Definir como pendente
          </DropdownMenuItem>

          {canApprove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isApproved}
                onClick={() => setPendingAction('approve')}
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar candidato
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {config && (
        <ConfirmDialog
          open={pendingAction !== null}
          onOpenChange={open => !open && setPendingAction(null)}
          title={config.title}
          description={config.description}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          variant={config.variant}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
