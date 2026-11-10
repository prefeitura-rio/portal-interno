'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ModelsRedirectRule } from '@/http-redirecionamentos/models'
import { formatDateBR } from '@/lib/format'
import { Loader2 } from 'lucide-react'
import { useRedirectHistory } from '../hooks/use-redirects'
import {
  describeEventChanges,
  formatEventAction,
  maskCpf,
} from '../lib/redirects-utils'

interface RuleHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: ModelsRedirectRule | null
}

export function RuleHistoryDialog({
  open,
  onOpenChange,
  rule,
}: RuleHistoryDialogProps) {
  const { data, isLoading, error } = useRedirectHistory(rule?.id ?? null, open)
  const events = data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Histórico da regra</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {rule ? `${rule.host ?? ''}${rule.path ?? ''}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando histórico...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
              Erro ao carregar histórico: {error.message}
            </div>
          )}

          {!isLoading && !error && events.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum evento registrado para esta regra.
            </p>
          )}

          {events.map(event => {
            const changes = describeEventChanges(event)
            return (
              <div
                key={event.id}
                className="space-y-2 rounded-md border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {formatEventAction(event.action)}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {maskCpf(event.actor)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateBR(event.created_at, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }) || '—'}
                  </span>
                </div>

                {changes.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {changes.map(change => (
                      <li key={change} className="font-mono break-all">
                        {change}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
