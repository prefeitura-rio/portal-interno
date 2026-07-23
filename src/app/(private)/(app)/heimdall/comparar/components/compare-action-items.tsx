'use client'

import { Button } from '@/components/ui/button'
import type { CompareActionItem } from '@/lib/heimdall-compare'
import { Check, Copy, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CompareStatusBadge } from './compare-status-badge'

interface CompareActionItemsProps {
  items: CompareActionItem[]
}

export function CompareActionItems({ items }: CompareActionItemsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCopy(item: CompareActionItem) {
    try {
      await navigator.clipboard.writeText(item.copyPayload)
      setCopiedId(item.id)
      toast.success('Payload copiado')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhuma tomada de ação — ambientes alinhados nas divergências listadas.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">
          Tomadas de ação ({items.length})
        </h2>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CompareStatusBadge status={item.status} />
                <span className="text-xs uppercase text-muted-foreground">
                  {item.dimension}
                </span>
              </div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? (
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => handleCopy(item)}
            >
              {copiedId === item.id ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copiar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
