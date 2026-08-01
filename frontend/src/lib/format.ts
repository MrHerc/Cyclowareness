/**
 * Formatting, in one place.
 *
 * The rule these functions exist to enforce: **absent is not zero**. A rate the
 * server could not measure comes back `null`, and every one of these renders it
 * as an em dash rather than a confident `0%`. A product that rounds "we do not
 * know" down to "nothing happened" is lying in the direction that flatters it.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
