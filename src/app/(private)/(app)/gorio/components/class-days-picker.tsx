'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useEffect, useRef, useState } from 'react'
import {
  DAYS_ORDER,
  parseClassDays,
  serializeClassDays,
} from './schedule-utils'

interface ClassDaysPickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ClassDaysPicker({
  value,
  onChange,
  disabled,
}: ClassDaysPickerProps) {
  const legacyRef = useRef<string>('')
  const mountedRef = useRef(false)
  const [legacyDetected, setLegacyDetected] = useState(false)

  // Detect legacy value on mount only — capture initialValue before any onChange fires
  const initialValueRef = useRef(value)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const initial = initialValueRef.current
    if (!initial) return
    const parsed = parseClassDays(initial)
    if (parsed.size === 0) {
      legacyRef.current = initial
      setLegacyDetected(true)
    }
  }, []) // intentionally empty — runs once on mount using captured initialValueRef

  const selected = parseClassDays(value)
  // If value is legacy, selected will be empty — checkboxes show unchecked, correct.
  // The actual checked state derives from the current form value after user interaction.
  const hasNewValue = selected.size > 0

  function toggle(day: string) {
    const next = new Set(selected)
    if (next.has(day)) {
      next.delete(day)
    } else {
      next.add(day)
    }
    const serialized = serializeClassDays(next)
    // Protect: if user deselects all and there's a legacy value, preserve legacy
    if (!serialized && legacyRef.current) {
      onChange(legacyRef.current)
      return
    }
    onChange(serialized)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {DAYS_ORDER.map(day => {
          const id = `day-checkbox-${day}`
          return (
            <div key={day} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.has(day)}
                onCheckedChange={() => toggle(day)}
                disabled={disabled}
              />
              <Label htmlFor={id} className="cursor-pointer font-medium">
                {day}
              </Label>
            </div>
          )
        })}
      </div>

      {/* Legacy value badge */}
      {legacyDetected && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-amber-500/70">
            Valor atual (formatação antiga)
          </span>
          <span className="truncate text-sm text-amber-200/60">
            {legacyRef.current}
          </span>
        </div>
      )}

      {/* New value preview + replacement warning */}
      {hasNewValue && (
        <>
          <input
            readOnly
            value={value}
            tabIndex={-1}
            className="h-9 w-full cursor-default select-none rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm"
          />
          {legacyDetected && (
            <p className="text-xs text-amber-500/70">
              ⚠ Este novo valor substituirá a formatação antiga ao salvar.
            </p>
          )}
        </>
      )}
    </div>
  )
}
