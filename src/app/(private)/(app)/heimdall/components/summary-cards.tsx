'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { type HeimdallTone, SUMMARY_TONE_CLASSES } from '../lib/tones'

export interface SummaryCardItem {
  label: string
  value: number
  icon?: LucideIcon
  tone?: HeimdallTone
}

interface SummaryCardsProps {
  items: SummaryCardItem[]
  loading?: boolean
}

export function SummaryCards({ items, loading = false }: SummaryCardsProps) {
  const gridCols =
    items.length >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : items.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-3'

  return (
    <div className={cn('grid gap-4', gridCols)}>
      {items.map(item => {
        const tone = SUMMARY_TONE_CLASSES[item.tone ?? 'gray']
        const Icon = item.icon

        return (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-4',
              tone.panel
            )}
          >
            {Icon && (
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  tone.iconBox
                )}
              >
                <Icon className={cn('h-5 w-5', tone.icon)} />
              </div>
            )}
            <div className="min-w-0">
              {loading ? (
                <Skeleton className="mb-1 h-8 w-16" />
              ) : (
                <p className={cn('text-2xl font-bold', tone.value)}>
                  {item.value}
                </p>
              )}
              <p className={cn('text-sm', tone.label)}>{item.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
