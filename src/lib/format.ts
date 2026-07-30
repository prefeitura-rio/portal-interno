export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts,
    }).format(new Date(date))
  } catch (_err) {
    return ''
  }
}

// Rio de Janeiro timezone. Pin it when formatting API instants so the calendar
// day is stable across runtimes: the backend serializes timestamps with a
// -03:00 offset (e.g. "2026-07-30T23:59:59-03:00"), and formatting without a
// fixed timeZone reads the browser/OS zone — a UTC pod (SSR/staging) would show
// the next day (31/07) while localhost (-03:00) shows 30/07.
export const APP_TIME_ZONE = 'America/Sao_Paulo'

// Formats a date as pt-BR pinned to APP_TIME_ZONE. Defaults to dd/MM/yyyy;
// pass Intl options (e.g. { dateStyle: 'short', timeStyle: 'short' }) to override.
export function formatDateBR(
  date: Date | string | number | null | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date && date !== 0) return ''

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIME_ZONE,
      ...opts,
    }).format(parsed)
  } catch (_err) {
    return ''
  }
}
