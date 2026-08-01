/**
 * Measurement windows, as plain data.
 *
 * Split from `DateRangeSelector` for two reasons. A metric only needs to *print*
 * the range it was measured over, and pulling that from the component file would
 * drag Radix Popover into every tree that renders a number. And a page that
 * resolves a range for a query has no business importing a control to do it.
 *
 * Everything here works in `YYYY-MM-DD` strings on the viewer's local calendar.
 * `new Date('2026-07-01')` is UTC midnight, which lands on 30 June for anyone
 * west of Greenwich — one silent off-by-one day in every window. These helpers
 * build and read dates from local components so that cannot happen.
 */

export type DateRangePreset = '7d' | '30d' | '90d' | 'quarter' | 'custom'

export interface DateRangeValue {
  preset: DateRangePreset
  /** Inclusive calendar dates, `YYYY-MM-DD`. */
  from: string
  to: string
}

export const DATE_RANGE_PRESETS: { key: Exclude<DateRangePreset, 'custom'>; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'quarter', label: 'This quarter' },
]

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  quarter: 'This quarter',
  custom: 'Custom range',
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Resolves a preset against a day. Both ends inclusive. */
export function resolveRange(
  preset: Exclude<DateRangePreset, 'custom'>,
  today: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (preset === 'quarter') {
    const from = new Date(to.getFullYear(), Math.floor(to.getMonth() / 3) * 3, 1)
    return { from: toISODate(from), to: toISODate(to) }
  }

  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - (days - 1))
  return { from: toISODate(from), to: toISODate(to) }
}

/** "1–30 Jul 2026" — the dates themselves, never the preset name. */
export function formatRangeLabel(from: string, to: string): string {
  const start = fromISODate(from)
  const end = fromISODate(to)
  if (!start || !end) return 'Range not set'

  const month = (date: Date) => date.toLocaleDateString(undefined, { month: 'short' })
  const sameYear = start.getFullYear() === end.getFullYear()

  if (sameYear && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${month(end)} ${end.getFullYear()}`
  }
  if (sameYear) {
    return `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`
  }
  return `${start.getDate()} ${month(start)} ${start.getFullYear()} – ${end.getDate()} ${month(end)} ${end.getFullYear()}`
}

/** Inclusive day count — the denominator behind any "per day" figure. */
export function rangeDays(from: string, to: string): number | null {
  const start = fromISODate(from)
  const end = fromISODate(to)
  if (!start || !end) return null
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/** A ready default so a page never has to invent one. */
export function defaultDateRange(
  preset: Exclude<DateRangePreset, 'custom'> = '30d',
): DateRangeValue {
  return { preset, ...resolveRange(preset) }
}
