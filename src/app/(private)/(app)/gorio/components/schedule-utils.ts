export const DAYS_ORDER = [
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
  'Dom',
] as const

export type DayAbbrev = (typeof DAYS_ORDER)[number]

export interface DayTimeEntry {
  day: string
  start: string // "HH:MM" (24h, for input[type=time])
  end: string // "HH:MM" (24h, for input[type=time])
}

export type ParsedClassTime =
  | { mode: 'same'; start: string; end: string }
  | { mode: 'different'; entries: DayTimeEntry[] }
  | null

// ---------------------------------------------------------------------------
// classDays helpers
// ---------------------------------------------------------------------------

export function parseClassDays(value: string | null | undefined): Set<string> {
  if (!value) return new Set()
  return new Set(
    value
      .split(',')
      .map(d => d.trim())
      .filter(d => (DAYS_ORDER as readonly string[]).includes(d))
  )
}

export function serializeClassDays(selected: Set<string>): string {
  return DAYS_ORDER.filter(d => selected.has(d)).join(', ')
}

// ---------------------------------------------------------------------------
// Time format helpers
// ---------------------------------------------------------------------------

// "17:30" → "17h30"  |  "17:00" → "17h"
export function formatTimeToDisplay(timeStr: string): string {
  if (!timeStr) return ''
  const [hRaw, mRaw] = timeStr.split(':')
  const h = Number.parseInt(hRaw, 10)
  const m = Number.parseInt(mRaw ?? '0', 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

// "17h30" → "17:30"  |  "17h" → "17:00"  (for input[type=time])
export function parseTimeFromDisplay(display: string): string {
  if (!display) return ''
  const match = display.match(/^(\d{1,2})h(\d{2})?$/)
  if (!match) return ''
  const h = match[1].padStart(2, '0')
  const m = (match[2] ?? '00').padStart(2, '0')
  return `${h}:${m}`
}

// ---------------------------------------------------------------------------
// classTime serialize
// ---------------------------------------------------------------------------

// Mode 1: ("17:30", "19:00") → "17h30 até 19h00"
export function serializeSameTime(start: string, end: string): string {
  if (!start || !end) return ''
  return `${formatTimeToDisplay(start)} até ${formatTimeToDisplay(end)}`
}

// Mode 2: DayTimeEntry[] → "Seg, Ter - 19h30 até 20h00 | Qui - 21h00 até 22h00"
// Groups days with identical start+end; orders by DAYS_ORDER.
export function serializePerDayTimes(entries: DayTimeEntry[]): string {
  const complete = entries.filter(e => e.start && e.end)
  if (complete.length === 0) return ''

  // Group by "start|end" key, preserving canonical day order within each group
  const groups = new Map<string, string[]>()
  for (const entry of complete) {
    const key = `${entry.start}|${entry.end}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry.day)
  }

  // Sort groups by the canonical index of their first day
  const sortedGroups = [...groups.entries()].sort(([, daysA], [, daysB]) => {
    const firstA = DAYS_ORDER.indexOf(daysA[0] as DayAbbrev)
    const firstB = DAYS_ORDER.indexOf(daysB[0] as DayAbbrev)
    return firstA - firstB
  })

  return sortedGroups
    .map(([key, days]) => {
      const [start, end] = key.split('|')
      const sortedDays = [...days].sort(
        (a, b) =>
          DAYS_ORDER.indexOf(a as DayAbbrev) -
          DAYS_ORDER.indexOf(b as DayAbbrev)
      )
      return `${sortedDays.join(', ')} - ${formatTimeToDisplay(start)} até ${formatTimeToDisplay(end)}`
    })
    .join(' | ')
}

// ---------------------------------------------------------------------------
// classTime deserialize (for edit mode)
// ---------------------------------------------------------------------------

function parseSegment(
  segment: string
): { days: string[]; start: string; end: string } | null {
  // Pattern: "DayList - startTime até endTime"
  const withDays = segment.match(/^(.+?)\s+-\s+(.+?)\s+até\s+(.+)$/)
  if (withDays) {
    const days = withDays[1].split(',').map(d => d.trim())
    return {
      days,
      start: parseTimeFromDisplay(withDays[2].trim()),
      end: parseTimeFromDisplay(withDays[3].trim()),
    }
  }
  return null
}

export function parseClassTime(
  value: string | null | undefined
): ParsedClassTime {
  if (!value) return null

  // Mode 1: "17h30 até 19h00" — no '|', no ' - '
  if (!value.includes('|') && !value.includes(' - ')) {
    const match = value.match(/^(.+?)\s+até\s+(.+)$/)
    if (match) {
      const start = parseTimeFromDisplay(match[1].trim())
      const end = parseTimeFromDisplay(match[2].trim())
      if (start && end) return { mode: 'same', start, end }
    }
    return null
  }

  // Mode 2: segments split by " | "
  const segments = value.split(' | ')
  const entries: DayTimeEntry[] = []
  for (const seg of segments) {
    const parsed = parseSegment(seg.trim())
    if (!parsed) return null // malformed → leave state untouched
    for (const day of parsed.days) {
      entries.push({ day, start: parsed.start, end: parsed.end })
    }
  }
  if (entries.length > 0) {
    return { mode: 'different', entries }
  }

  return null
}
