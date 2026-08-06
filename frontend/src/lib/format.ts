/**
 * Formatting, in one place.
 *
 * The rule these functions exist to enforce: **absent is not zero**. A rate the
 * server could not measure comes back `null`, and every one of these renders it
 * as an em dash rather than a confident `0%`. A product that rounds "we do not
 * know" down to "nothing happened" is lying in the direction that flatters it.
 */

import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `text-*` is two utilities wearing one prefix: a SIZE (`text-body`) and a
 * COLOUR (`text-fg-muted`). tailwind-merge knows the built-in sizes, but our
 * scale in `tokens.css` is our own, so it read `text-body` as a colour, put it
 * in the same conflict group as the real colour, and kept whichever came last.
 *
 * The class it dropped was silent. The primary button rendered `bg-brand` with
 * no colour class at all and inherited whatever the surrounding surface used —
 * on the light sign-in ground that was near-black text on dark green, 2.9:1,
 * a straight WCAG failure that no test caught because the class list looked
 * fine in source and only the merged output was wrong.
 *
 * Naming the seven non-standard sizes puts them back in `font-size`, where a
 * colour no longer collides with them. `sm` and `xs` are already built in.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['hero', 'display', 'title', 'h', 'lead', 'body', 'label'] }],
    },
  },
})

/** Merge Tailwind classes, letting later ones win conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/* ============================================================================
   Numbers
   ========================================================================== */

export function pct(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

export function signed(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`
}

export function bytes(size: number | null | undefined): string {
  if (size === null || size === undefined) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  if (minutes < 60) return `${minutes}m ${rest}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/* ============================================================================
   Time
   ========================================================================== */

/**
 * Backend datetimes may arrive without a timezone suffix (SQLite). Treating a
 * naive timestamp as local time shifts every "x minutes ago" by the user's
 * offset, so an unsuffixed value is read as UTC — which is what the server
 * actually stores.
 */
function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const normalized = /[zZ]$|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function timeAgo(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 2592000)}mo ago`
}

/** "in 3d" / "2d overdue" — deadlines read differently from history. */
export function deadlineIn(iso: string | null | undefined): { text: string; overdue: boolean } {
  const date = parse(iso)
  if (!date) return { text: 'No deadline', overdue: false }
  const diffMs = date.getTime() - Date.now()
  const days = Math.round(Math.abs(diffMs) / 86400000)
  if (diffMs < 0) return { text: days === 0 ? 'Due today' : `${days}d overdue`, overdue: true }
  if (days === 0) return { text: 'Due today', overdue: false }
  return { text: `in ${days}d`, overdue: false }
}

/**
 * The locale these functions format in.
 *
 * Read from `<html lang>` rather than plumbed through as a parameter or a hook.
 * The provider already writes that attribute — it has to, because a screen
 * reader picks its voice from it — so it is the DOM's own statement of what
 * language the page is in, and reading it back keeps these plain functions
 * plain. Call sites number in the hundreds; none of them should have to know.
 *
 * `undefined` means "use the browser's own", which is the correct answer before
 * React has mounted and during a server-side render.
 */
export function activeLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const lang = document.documentElement.lang
  return lang || undefined
}

/**
 * Does this locale actually have month NAMES, or only a placeholder?
 *
 * Measured, not assumed: in this browser's ICU data,
 * `toLocaleDateString('az', { month: 'short' })` returns "2026 M08 5" — `M08`
 * is a fallback token, not a month, and it is worse to read than the English it
 * replaced. The numeric form for the same locale is "2026-08-05", which is both
 * correct and unambiguous.
 *
 * So the format is chosen by asking the browser rather than by hardcoding a
 * list of locales: if the short month for a known date contains no letters, use
 * numbers. If a future ICU ships real Azerbaijani month names, this starts
 * using them with no change here.
 */
const SAMPLE = new Date(Date.UTC(2026, 7, 5))
let namesUsable: boolean | null = null

function monthNamesUsable(locale: string | undefined): boolean {
  if (namesUsable === null) {
    try {
      // Isolate the MONTH part — testing the whole formatted string does not
      // work, and this is the mistake the first attempt made: "2026 M08 5"
      // contains the letter M, so "does it have letters" answered yes and the
      // placeholder shipped anyway. A real name is not `M08`, `08` or `8`.
      const part = new Intl.DateTimeFormat(locale, { month: 'short' })
        .formatToParts(SAMPLE)
        .find((piece) => piece.type === 'month')
      namesUsable = part ? !/^M?\d+$/.test(part.value) : true
    } catch {
      namesUsable = true
    }
  }
  return namesUsable
}

/** Reset when the language changes — the answer depends on the locale. */
/** `'short'` where the locale has real month names, `'numeric'` where it does
 *  not. Every date in the product must ask this — three call sites outside this
 *  file did not, so one page showed "2026-08-04" and "7 Jul – 5 Aug 2026" at the
 *  same time, which is two systems in one screenshot. */
export function monthStyle(): 'short' | 'numeric' {
  return monthNamesUsable(activeLocale()) ? 'short' : 'numeric'
}

export function resetDateFormatCache(): void {
  namesUsable = null
}

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  const locale = activeLocale()
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: monthNamesUsable(locale) ? 'short' : 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  const locale = activeLocale()
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: monthNamesUsable(locale) ? 'short' : 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return date.toLocaleTimeString(activeLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/* ============================================================================
   Words
   ========================================================================== */

/** `awaiting_approval` -> `Awaiting approval`. Sentence case, always. */
export function humanise(value: string | null | undefined): string {
  if (!value) return '—'
  const spaced = value.replace(/[_-]/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return ''
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** Renders a URL unclickable for display. Never used to sanitise — only to show. */
export function defang(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/\./g, '[.]').replace(/^http/i, 'hxxp')
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  url: 'URL',
  file: 'File',
  sms: 'SMS',
  qr: 'QR code',
  chat: 'Chat',
  web: 'Web',
}

export function channelLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return CHANNEL_LABELS[value] ?? humanise(value)
}

/* ============================================================================
   Risk
   ========================================================================== */

export function riskBand(score: number): 'low' | 'elevated' | 'high' {
  if (score >= 60) return 'high'
  if (score >= 40) return 'elevated'
  return 'low'
}

export function riskBandLabel(score: number): string {
  const band = riskBand(score)
  return band === 'high' ? 'High risk' : band === 'elevated' ? 'Elevated' : 'Low risk'
}

/**
 * The caption under a windowed rate. When the sample is too small it says so —
 * with the actual n — instead of dressing a missing measurement as a healthy one.
 */
export function metricCaption(
  value: number | null,
  sample: number,
  windowDays: number,
  hint?: string,
): string {
  if (value === null || value === undefined) {
    return sample === 0
      ? `No measurements in the last ${windowDays} days`
      : `Not enough data yet — ${sample} sample${sample === 1 ? '' : 's'}`
  }
  const base = `Last ${windowDays} days · n=${sample}`
  return hint ? `${base} · ${hint}` : base
}
