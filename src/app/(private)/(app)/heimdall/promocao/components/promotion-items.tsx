'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  PROMOTION_ENTITY_LABEL,
  PROMOTION_STATUS_LABEL,
  type PromotionItem,
  type PromotionItemStatus,
  type PromotionOperation,
  displayPromotionKey,
  promotionItemId,
} from '@/lib/heimdall-promotion'
import { BADGE_TONE_CLASSES, type HeimdallTone } from '../../lib/tones'

const STATUS_TONE: Record<PromotionItemStatus, HeimdallTone> = {
  missing: 'orange',
  present: 'green',
  not_in_source: 'gray',
  protected: 'gray',
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

interface PromotionItemListProps {
  title: string
  description: string
  items: PromotionItem[]
  required: boolean
  isChecked: (id: string) => boolean
  statusOf: (id: string) => PromotionItemStatus | undefined
  onToggle: (id: string, checked: boolean) => void
}

export function PromotionItemList({
  title,
  description,
  items,
  required,
  isChecked,
  statusOf,
  onToggle,
}: PromotionItemListProps) {
  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-medium">
          {title} ({items.length})
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ul className="divide-y rounded-lg border">
        {items.map(item => {
          const id = promotionItemId(item)
          const status = statusOf(id)
          const checked = isChecked(id)
          return (
            <li key={id} className="flex items-start gap-3 p-3">
              <Checkbox
                id={id}
                className="mt-0.5"
                checked={checked}
                onCheckedChange={value => onToggle(id, value === true)}
              />
              <label htmlFor={id} className="min-w-0 flex-1 space-y-1">
                <span className="block text-xs text-muted-foreground">
                  {PROMOTION_ENTITY_LABEL[item.entity]}
                </span>
                <code className="block break-all text-xs">
                  {displayPromotionKey(item.key)}
                </code>
                {required && !checked && status === 'missing' ? (
                  <span className="block text-xs text-orange-700 dark:text-orange-400">
                    Sem este item o deploy do release continua bloqueado.
                  </span>
                ) : null}
              </label>
              {status ? (
                <Badge
                  variant="outline"
                  className={BADGE_TONE_CLASSES[STATUS_TONE[status]]}
                >
                  {PROMOTION_STATUS_LABEL[status]}
                </Badge>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function PromotionOperationList({
  operations,
}: {
  operations: PromotionOperation[]
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {operations.map(operation => (
        <li
          key={`${operation.entity}-${operation.key}`}
          className="flex items-start gap-3 p-3"
        >
          <Badge
            variant="outline"
            className={
              operation.op === 'create'
                ? BADGE_TONE_CLASSES.green
                : BADGE_TONE_CLASSES.yellow
            }
          >
            {operation.op === 'create' ? 'Criar' : 'Atualizar'}
          </Badge>
          <div className="min-w-0 space-y-1">
            <span className="block text-xs text-muted-foreground">
              {PROMOTION_ENTITY_LABEL[operation.entity]}
              {operation.dependency ? ' · incluído por dependência' : ''}
            </span>
            <code className="block break-all text-xs">
              {displayPromotionKey(operation.key)}
            </code>
            {operation.op === 'update' ? (
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {Object.entries(operation.after).map(([field, value]) => (
                  <li key={field}>
                    {field}: <s>{displayValue(operation.before?.[field])}</s> →{' '}
                    <span className="text-foreground">
                      {displayValue(value)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : operation.entity === 'mapping' ? (
              <span className="block text-xs text-muted-foreground">
                action: {displayValue(operation.after.action)}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
