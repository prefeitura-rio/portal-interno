'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

interface ExpandableTextProps {
  text: string
  className?: string
  /** Number of lines to show when collapsed. Defaults to 3. */
  collapsedLines?: 2 | 3 | 4 | 5
}

const COLLAPSED_CLASSES: Record<number, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
}

export function ExpandableText({
  text,
  className,
  collapsedLines = 3,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [isClamped, setIsClamped] = React.useState(false)
  const textRef = React.useRef<HTMLParagraphElement>(null)
  const clampClass = COLLAPSED_CLASSES[collapsedLines]

  const measure = React.useCallback(() => {
    const el = textRef.current
    if (!el) return
    el.classList.remove(clampClass)
    const naturalHeight = el.scrollHeight
    el.classList.add(clampClass)
    setIsClamped(naturalHeight > el.offsetHeight)
  }, [clampClass])

  // Re-measure whenever text or collapsedLines changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: text triggers re-measure via measure()
  React.useLayoutEffect(() => {
    setExpanded(false)
    measure()
  }, [text, measure])

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <p
          ref={textRef}
          className={cn(
            'text-xs transition-[max-height] duration-300 ease-in-out',
            !expanded && clampClass
          )}
        >
          {text}
        </p>

        {/* fade mask — only when collapsed and clamped */}
        {!expanded && isClamped && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-sm"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, color-mix(in oklch, var(--color-background) 95%, transparent) 80%)',
            }}
          />
        )}
      </div>

      {isClamped && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Recolher texto' : 'Expandir texto'}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Ver mais
            </>
          )}
        </button>
      )}
    </div>
  )
}
