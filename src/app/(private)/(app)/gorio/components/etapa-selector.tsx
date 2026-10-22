'use client'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  XCircle,
} from 'lucide-react'
import * as React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Etapa {
  id: string
  titulo?: string | null
}

type SelectionKind = 'etapa' | 'recusar' | 'aprovar'

interface Selection {
  kind: SelectionKind
  /** null means "Candidatura recebida (Padrão do sistema)" */
  etapaId: string | null
}

export interface EtapaSelectorProps {
  etapas: Etapa[]
  currentEtapaId: string | undefined | null
  /** Unique identifier of the candidato — used to detect candidato switches and reset state. */
  candidatoId: string
  canApprove: boolean
  isRejected: boolean
  isApproved: boolean
  onMoveEtapa: (idEtapa: string | null) => Promise<void>
  onReject: () => Promise<void>
  onApprove: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function etapaLabel(etapa: Etapa, index: number): string {
  return etapa.titulo ?? `Etapa ${index + 2}`
}

function selectionLabel(sel: Selection, etapas: Etapa[]): string {
  if (sel.kind === 'recusar') return 'Recusar candidato'
  if (sel.kind === 'aprovar') return 'Aprovar candidato'
  if (sel.etapaId === null) return 'Candidatura recebida (Padrão do sistema)'
  const found = etapas.find(e => e.id === sel.etapaId)
  return found?.titulo ?? 'Candidatura recebida (Padrão do sistema)'
}

function commitLabel(sel: Selection): string {
  if (sel.kind === 'recusar') return 'Recusar candidato'
  if (sel.kind === 'aprovar') return 'Aprovar candidato'
  return 'Mover'
}

// ─── Component ────────────────────────────────────────────────────────────────

const SUCCESS_TIMEOUT_MS = 10_000

export function EtapaSelector({
  etapas,
  currentEtapaId,
  candidatoId,
  canApprove,
  isRejected,
  isApproved,
  onMoveEtapa,
  onReject,
  onApprove,
}: EtapaSelectorProps) {
  const [selection, setSelection] = React.useState<Selection>({
    kind: 'etapa',
    etapaId: currentEtapaId ?? null,
  })
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [successVisible, setSuccessVisible] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCandidatoIdRef = React.useRef<string>(candidatoId)

  // When candidato switches, fully reset including success message.
  // When only the etapa changes within the same candidato (after a move),
  // sync the selection without clearing the success feedback.
  React.useEffect(() => {
    const candidatoChanged = prevCandidatoIdRef.current !== candidatoId
    prevCandidatoIdRef.current = candidatoId
    setSelection({ kind: 'etapa', etapaId: currentEtapaId ?? null })
    if (candidatoChanged) {
      setSuccessVisible(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [candidatoId, currentEtapaId])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function startSuccessTimer() {
    setSuccessVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSuccessVisible(false)
      timerRef.current = null
    }, SUCCESS_TIMEOUT_MS)
  }

  function handleCommit() {
    setConfirmOpen(true)
  }

  async function handleConfirmed() {
    setConfirmOpen(false)

    if (selection.kind === 'recusar') {
      setLoading(true)
      try {
        await onReject()
      } finally {
        setLoading(false)
      }
      return
    }
    if (selection.kind === 'aprovar') {
      setLoading(true)
      try {
        await onApprove()
      } finally {
        setLoading(false)
      }
      return
    }
    if (isSameEtapa) return
    // mover para etapa diferente
    setLoading(true)
    try {
      await onMoveEtapa(selection.etapaId)
      startSuccessTimer()
    } finally {
      setLoading(false)
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isSameEtapa =
    selection.kind === 'etapa' &&
    (selection.etapaId ?? null) === (currentEtapaId ?? null)

  const targetEtapaLabel =
    selection.kind === 'etapa' && selection.etapaId !== null
      ? (etapas.find(e => e.id === selection.etapaId)?.titulo ?? 'esta etapa')
      : null

  const confirmDescription = isSameEtapa
    ? 'Você selecionou a mesma etapa em que o candidato já está posicionado atualmente.'
    : selection.kind === 'recusar'
      ? 'Recusar um candidato é uma ação definitiva. Deseja continuar?'
      : selection.kind === 'aprovar'
        ? 'Aprovar um candidato é uma ação definitiva. Deseja continuar?'
        : `Deseja mover o candidato para "${targetEtapaLabel ?? 'Candidatura recebida'}"?`

  const isDestructive = selection.kind === 'recusar'
  const isApprove = selection.kind === 'aprovar'
  const isBlocked = isRejected || isApproved

  return (
    <>
      <div className="flex gap-2 items-center">
        {/* ── Dropdown (DropdownMenu funciona dentro de Sheet) ───────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isBlocked}
              className={cn(
                'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-3 text-sm transition-colors h-9',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                isDestructive
                  ? 'border-destructive/60 bg-destructive/5 text-destructive'
                  : isApprove
                    ? 'border-green-500/60 bg-green-500/5 text-green-700 dark:text-green-400'
                    : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="truncate">
                {selectionLabel(selection, etapas)}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
          >
            {/* ── Etapas do processo ────────────────────────────────────────── */}
            <DropdownMenuItem disabled className="opacity-50">
              <span className="flex-1">
                Candidatura recebida (Padrão do sistema)
              </span>
              {!currentEtapaId && (
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  Atual
                </span>
              )}
            </DropdownMenuItem>

            {etapas.map((etapa, index) => (
              <DropdownMenuItem
                key={etapa.id}
                className="cursor-pointer hover:bg-accent"
                onSelect={() =>
                  setSelection({ kind: 'etapa', etapaId: etapa.id })
                }
              >
                <span className="flex-1">{etapaLabel(etapa, index)}</span>
                {currentEtapaId === etapa.id && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    Atual
                  </span>
                )}
                {selection.kind === 'etapa' &&
                  selection.etapaId === etapa.id &&
                  currentEtapaId !== etapa.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 ml-2 opacity-60" />
                  )}
              </DropdownMenuItem>
            ))}

            {/* ── Ações definitivas ────────────────────────────────────────── */}
            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={isRejected}
              className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={() =>
                setSelection({
                  kind: 'recusar',
                  etapaId: currentEtapaId ?? null,
                })
              }
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">Recusar candidato</span>
              {selection.kind === 'recusar' && (
                <Check className="h-3.5 w-3.5 shrink-0 ml-2 opacity-60" />
              )}
            </DropdownMenuItem>

            {canApprove && (
              <DropdownMenuItem
                disabled={isApproved}
                className="cursor-pointer text-green-700 dark:text-green-400 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-400 focus:bg-green-500/10 focus:text-green-700 dark:focus:text-green-400"
                onSelect={() =>
                  setSelection({
                    kind: 'aprovar',
                    etapaId: currentEtapaId ?? null,
                  })
                }
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">Aprovar candidato</span>
                {selection.kind === 'aprovar' && (
                  <Check className="h-3.5 w-3.5 shrink-0 ml-2 opacity-60" />
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Commit button ─────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleCommit}
          disabled={loading || isBlocked}
          className={cn(
            'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-medium whitespace-nowrap text-white',
            'ring-offset-background transition-colors shadow-[0_1px_4px_0_#DFDFDF]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            isDestructive
              ? 'bg-destructive hover:bg-destructive/90'
              : isApprove
                ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                : 'bg-[#1976D2] hover:bg-[#1565C0]'
          )}
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {commitLabel(selection)}
        </button>
      </div>

      {/* ── Feedback de sucesso ───────────────────────────────────────────────── */}
      <p
        className={cn(
          'text-xs text-green-600 dark:text-green-400 transition-opacity duration-500',
          successVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        Candidato movido de etapa com sucesso!
      </p>

      {/* ── Feedback de bloqueio ─────────────────────────────────────────────── */}
      {isBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {isRejected
              ? 'Candidato recusado. Não é possível alterar a etapa.'
              : 'Candidato aprovado. Não é possível alterar a etapa.'}
          </p>
        </div>
      )}

      {/* ── Modal de confirmação ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={open => !open && setConfirmOpen(false)}
        title="Atenção!"
        description={confirmDescription}
        confirmText={isSameEtapa ? 'Entendi' : 'Sim'}
        cancelText={isSameEtapa ? undefined : 'Não'}
        variant={isDestructive ? 'destructive' : 'default'}
        onConfirm={handleConfirmed}
      >
        {(isDestructive || isApprove) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Após confirmar, não será possível alterar a etapa do candidato.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
