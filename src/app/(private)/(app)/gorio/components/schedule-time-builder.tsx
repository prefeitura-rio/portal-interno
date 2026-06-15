'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect, useRef, useState } from 'react'
import {
  DAYS_ORDER,
  type DayTimeEntry,
  parseClassDays,
  parseClassTime,
  serializePerDayTimes,
  serializeSameTime,
} from './schedule-utils'

type ScheduleMode = 'same' | 'different'

interface ScheduleTimeBuilderProps {
  value: string | null | undefined
  onChange: (value: string) => void
  classDays: string | null | undefined
  disabled?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Returns the earliest valid end time that is strictly after `start`.
function clampEnd(start: string): string {
  const [hS, mS] = start.split(':')
  const m = Number(mS)
  const nextM = MINUTES.find(min => Number(min) > m)
  if (nextM !== undefined) return `${hS}:${nextM}`
  // No available minute slot in the same hour — advance one hour at :00
  const nextH = String(Number(hS) + 1).padStart(2, '0')
  return `${nextH}:00`
}

interface TimeSelectProps {
  value: string // "HH:MM"
  onChange: (value: string) => void
  disabled?: boolean
  minHour?: string // items with hour < minHour are disabled
  disabledMinutes?: string[] // specific minute values to disable
}

function TimeSelect({
  value,
  onChange,
  disabled,
  minHour,
  disabledMinutes,
}: TimeSelectProps) {
  const parts = value ? value.split(':') : ['', '']
  const h = parts[0] || ''
  const m = parts[1] || '00'

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={h}
        onValueChange={newH => onChange(`${newH}:${m}`)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[76px]">
          <SelectValue placeholder="hh" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map(hour => (
            <SelectItem
              key={hour}
              value={hour}
              disabled={minHour !== undefined && hour < minHour}
            >
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs font-medium text-muted-foreground">h</span>
      <Select
        value={m}
        onValueChange={newM => onChange(`${h || '00'}:${newM}`)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[76px]">
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(min => (
            <SelectItem
              key={min}
              value={min}
              disabled={disabledMinutes?.includes(min)}
            >
              {min}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs font-medium text-muted-foreground">min</span>
    </div>
  )
}

function endHourConstraints(
  start: string,
  end: string
): {
  minHour: string | undefined
  disabledMinutes: string[]
} {
  if (!start) return { minHour: undefined, disabledMinutes: [] }
  const [hS, mS] = start.split(':')
  // Only disable the start hour in Fim when no minute slot is available there
  // (i.e. start minute is :45 — the last slot). Otherwise allow selecting the
  // same hour and let disabledMinutes handle the invalid minute slots.
  const hasAvailableMinuteInStartHour = MINUTES.some(
    min => Number(min) > Number(mS)
  )
  const minHour = hasAvailableMinuteInStartHour
    ? hS
    : String(Number(hS) + 1).padStart(2, '0')
  const [hE] = end ? end.split(':') : ['']
  const sameHour = hE === hS
  const disabledMinutes = sameHour
    ? MINUTES.filter(min => Number(min) <= Number(mS))
    : []
  return { minHour, disabledMinutes }
}

export function ScheduleTimeBuilder({
  value,
  onChange,
  classDays,
  disabled,
}: ScheduleTimeBuilderProps) {
  const [mode, setMode] = useState<ScheduleMode>('same')
  const [sameStart, setSameStart] = useState('')
  const [sameEnd, setSameEnd] = useState('')
  const [perDayTimes, setPerDayTimes] = useState<DayTimeEntry[]>([])
  const legacyRef = useRef<string>('')
  const [legacyDetected, setLegacyDetected] = useState(false)

  // lastExternalValue tracks the last value we received externally (from the form).
  // We use it to skip re-hydrating values that we ourselves emitted via onChange —
  // without this, our own emit bounces back and re-triggers hydration.
  const lastExternalValue = useRef<string | null | undefined>(undefined)

  // Hydrate internal state from external value (edit mode / after save+refetch).
  // Only runs when the incoming value truly changed from outside.
  useEffect(() => {
    // Skip if this is the same value we already processed
    if (value === lastExternalValue.current) return
    lastExternalValue.current = value

    if (!value) {
      setMode('same')
      setSameStart('')
      setSameEnd('')
      setPerDayTimes([])
      return
    }

    const parsed = parseClassTime(value)
    if (!parsed) {
      // Legacy free-text value — show badge, keep selects empty
      if (!legacyRef.current) {
        legacyRef.current = value
        setLegacyDetected(true)
      }
      return
    }

    if (parsed.mode === 'same') {
      setMode('same')
      setSameStart(parsed.start)
      setSameEnd(parsed.end)
    } else {
      setMode('different')
      setPerDayTimes(parsed.entries)
    }
  }, [value])

  // Sync per-day rows when classDays changes while in 'different' mode
  useEffect(() => {
    if (mode !== 'different') return
    const selectedDays = parseClassDays(classDays)
    const ordered = DAYS_ORDER.filter(d => selectedDays.has(d))
    setPerDayTimes(prev => {
      const existing = new Map(prev.map(e => [e.day, e]))
      return ordered.map(
        day => existing.get(day) ?? { day, start: '', end: '' }
      )
    })
  }, [classDays, mode])

  // Auto-reset to 'same' when all days are deselected
  useEffect(() => {
    if (mode === 'different' && parseClassDays(classDays).size === 0) {
      setMode('same')
    }
  }, [classDays, mode])

  // Emit the serialized value to the parent form.
  // Called directly from user interaction handlers — not from an effect —
  // so there's no risk of running with stale/intermediate state.
  function emit(
    nextMode: ScheduleMode,
    nextStart: string,
    nextEnd: string,
    nextPerDay: DayTimeEntry[]
  ) {
    const serialized =
      nextMode === 'same'
        ? serializeSameTime(nextStart, nextEnd)
        : serializePerDayTimes(nextPerDay)

    // Incomplete input (e.g. only start filled, end still empty) — don't
    // propagate an empty string to the form field. Clearing the field here
    // would also poison lastExternalValue.current with "" and prevent the
    // hydration effect from re-running when a valid value is loaded later.
    if (!serialized) return

    // Update our tracking ref so the hydrate effect skips this value when it
    // bounces back from the form (React Hook Form calls render with new field.value).
    lastExternalValue.current = serialized
    onChange(serialized)
  }

  function isValidTime(val: string): boolean {
    const [h, m] = val.split(':')
    return !!h && m !== undefined && m !== ''
  }

  function handleSameStart(val: string) {
    if (!isValidTime(val)) return
    let end = sameEnd
    // Auto-correct end if it's no longer after the new start
    if (end && toMinutes(end) <= toMinutes(val)) {
      end = clampEnd(val)
      setSameEnd(end)
    }
    setSameStart(val)
    emit('same', val, end, perDayTimes)
  }

  function handleSameEnd(val: string) {
    if (!isValidTime(val)) return
    let corrected = val
    // Auto-advance to the next valid slot instead of silently rejecting —
    // this handles the case where the user picks the start hour in Fim
    // while the current minute is still invalid (e.g. fim "14:00" when start is "14:00")
    if (sameStart && toMinutes(corrected) <= toMinutes(sameStart)) {
      corrected = clampEnd(sameStart)
    }
    setSameEnd(corrected)
    emit('same', sameStart, corrected, perDayTimes)
  }

  function updateEntry(index: number, field: 'start' | 'end', val: string) {
    if (!isValidTime(val)) return
    const entry = perDayTimes[index]

    if (field === 'start') {
      let end = entry.end
      if (end && toMinutes(end) <= toMinutes(val)) {
        end = clampEnd(val)
      }
      const next = perDayTimes.map((e, i) =>
        i === index ? { ...e, start: val, end } : e
      )
      setPerDayTimes(next)
      emit('different', sameStart, sameEnd, next)
    } else {
      let corrected = val
      if (entry.start && toMinutes(corrected) <= toMinutes(entry.start)) {
        corrected = clampEnd(entry.start)
      }
      const next = perDayTimes.map((e, i) =>
        i === index ? { ...e, end: corrected } : e
      )
      setPerDayTimes(next)
      emit('different', sameStart, sameEnd, next)
    }
  }

  function handleModeChange(newMode: ScheduleMode) {
    setMode(newMode)
    if (newMode === 'different') {
      const selectedDays = parseClassDays(classDays)
      const ordered = DAYS_ORDER.filter(d => selectedDays.has(d))
      const next = ordered.map(
        day =>
          perDayTimes.find(e => e.day === day) ?? { day, start: '', end: '' }
      )
      setPerDayTimes(next)
      emit('different', sameStart, sameEnd, next)
    } else {
      emit('same', sameStart, sameEnd, perDayTimes)
    }
  }

  const noDaysSelected = parseClassDays(classDays).size === 0

  const preview =
    mode === 'same'
      ? serializeSameTime(sameStart, sameEnd)
      : serializePerDayTimes(perDayTimes)

  const endConstraints = endHourConstraints(sameStart, sameEnd)

  return (
    <div className="space-y-3">
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
      {preview && (
        <>
          <input
            readOnly
            value={preview}
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

      <RadioGroup
        value={mode}
        onValueChange={v => handleModeChange(v as ScheduleMode)}
        disabled={disabled}
        className="flex flex-col gap-2 sm:flex-row sm:gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="same" id="schedule-mode-same" />
          <Label
            htmlFor="schedule-mode-same"
            className="cursor-pointer font-normal"
          >
            Mesmo horário para todos os dias
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="different"
            id="schedule-mode-different"
            disabled={disabled || noDaysSelected}
          />
          <Label
            htmlFor="schedule-mode-different"
            className={`cursor-pointer font-normal ${noDaysSelected ? 'text-muted-foreground' : ''}`}
          >
            Horários diferentes por dia
          </Label>
        </div>
      </RadioGroup>

      {mode === 'same' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="w-10 shrink-0 text-xs text-muted-foreground">
              Início
            </span>
            <TimeSelect
              value={sameStart}
              onChange={handleSameStart}
              disabled={disabled}
            />
          </div>
          <span className="px-1 text-sm text-muted-foreground">até</span>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="w-10 shrink-0 text-xs text-muted-foreground">
              Fim
            </span>
            <TimeSelect
              value={sameEnd}
              onChange={handleSameEnd}
              disabled={disabled || !sameStart}
              minHour={endConstraints.minHour}
              disabledMinutes={endConstraints.disabledMinutes}
            />
          </div>
        </div>
      )}

      {mode === 'different' &&
        (noDaysSelected ? (
          <p className="text-sm text-muted-foreground">
            Selecione os dias de aula acima para definir os horários.
          </p>
        ) : (
          <div className="space-y-2">
            {perDayTimes.map((entry, i) => {
              const ec = endHourConstraints(entry.start, entry.end)
              return (
                <div
                  key={entry.day}
                  className="flex items-center gap-4 rounded-md border border-border bg-muted/30 px-4 py-3"
                >
                  {/* Coluna esquerda — dia */}
                  <span className="w-8 shrink-0 text-sm font-semibold">
                    {entry.day}
                  </span>

                  {/* Divisor */}
                  <div className="h-10 w-px shrink-0 bg-border" />

                  {/* Coluna direita — Início e Fim empilhados */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-xs text-muted-foreground">
                        Início
                      </span>
                      <TimeSelect
                        value={entry.start}
                        onChange={val => updateEntry(i, 'start', val)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-xs text-muted-foreground">
                        Fim
                      </span>
                      <TimeSelect
                        value={entry.end}
                        onChange={val => updateEntry(i, 'end', val)}
                        disabled={disabled || !entry.start}
                        minHour={ec.minHour}
                        disabledMinutes={ec.disabledMinutes}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
