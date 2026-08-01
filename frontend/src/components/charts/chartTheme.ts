/**
 * The values every chart shares, and the guard that decides whether a trend may
 * be drawn at all.
 *
 * Recharts writes SVG attributes, not class names, so it cannot reach the
 * Tailwind colour utilities. Every colour here is therefore a `var(--color-*)`
 * reference into `design/tokens.css` — the tokens stay the one place a colour
 * is named, and a re-theme still reaches the charts.
 *
 * The honesty rules of this product land here as three concrete decisions:
 * `connectNulls` is never set (a gap is a gap), `hasEnoughPoints` gates every
 * trend, and the brand hue is absent from `SERIES` on purpose — cyan means
 * "this is Cyclowareness", never "this is the good line".
 */

import type { Severity } from '../../domain/types'

/* ============================================================================
   Colour
   ========================================================================== */

/** The categorical palette, in the order charts should consume it. */
export const SERIES = [
  'var(--color-series-1)',
  'var(--color-series-2)',
  'var(--color-series-3)',
  'var(--color-series-4)',
  'var(--color-series-5)',
] as const

/** Risk band fills, matching `riskBand()` in lib/format. */
export const BAND_COLOR: Record<'low' | 'elevated' | 'high', string> = {
  low: 'var(--color-safe)',
  elevated: 'var(--color-medium)',
  high: 'var(--color-critical)',
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
  // `info` is not a risk band, so it does not get a risk hue. Painting
  // "informational" the same way as "low risk" is how an analyst learns to
  // stop reading the bottom of the chart.
  info: 'var(--color-fg-faint)',
}

/** Canonical severity order — highest first, everywhere, always. */
export const SEVERITY_ORDER: readonly Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
] as const

/**
 * The diverging pair for a signed delta. Positive means risk went UP, which is
 * the bad direction — inverting this is the single easiest way to make a
 * worsening organisation look like a healthy one.
 */
export const DIVERGING = {
  worse: 'var(--color-critical)',
  better: 'var(--color-safe)',
  neutral: 'var(--color-fg-faint)',
} as const

/* ============================================================================
   Axes and grid — recessive by construction. The data is the loudest mark.
   ========================================================================== */

/** 11px matches the `--text-label` step; SVG text cannot take a type class. */
export const AXIS_TICK = { fill: 'var(--color-fg-faint)', fontSize: 11 } as const
export const AXIS_LINE = { stroke: 'var(--color-line)' } as const
export const GRID_STROKE = 'var(--color-line-subtle)'
export const GRID_DASH = '2 6'
export const CURSOR = { stroke: 'var(--color-line-strong)', strokeWidth: 1 } as const
export const ZERO_LINE = 'var(--color-line-strong)'

/** Pulls the y-axis labels tight against the plot without clipping them. */
export const PLOT_MARGIN = { top: 8, right: 10, bottom: 0, left: -12 } as const

/**
 * Every series draws its dots. With `connectNulls` off, a measured point
 * surrounded by unmeasured ones produces no line segment at all — without a
 * dot it would simply vanish, which turns "we measured this once" into
 * "we never measured".
 */
export const DOT_RADIUS = 2.5
export const ACTIVE_DOT_RADIUS = 4.5

/* ============================================================================
   The insufficient-data guard
   ========================================================================== */

/** How many of these values were actually measured. `null` is not a value. */
export function countMeasured(series: ReadonlyArray<number | null | undefined>): number {
  let measured = 0
  for (const value of series) {
    if (typeof value === 'number' && Number.isFinite(value)) measured += 1
  }
  return measured
}

/**
 * Whether a series may be drawn as a trend.
 *
 * One measured point is not a trend. Rendered anyway it becomes a two-pixel
 * slope that a reader will happily extrapolate, so the chart refuses and shows
 * "Trend unavailable" instead.
 */
export function hasEnoughPoints(
  series: ReadonlyArray<number | null | undefined>,
  min = 2,
): boolean {
  return countMeasured(series) >= min
}

/* ============================================================================
   Dates
   ========================================================================== */

/**
 * Trend points carry bare calendar days (`2026-07-01`). `lib/format` normalises
 * naive timestamps by appending `Z`, which a date-only string cannot take —
 * `new Date('2026-07-01Z')` is invalid. These read the day in UTC directly, so
 * a tick never slides to the previous day west of Greenwich.
 */
function utcDay(iso: string): Date | null {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

/** Axis ticks: "1 Jul". */
export function formatDayShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = utcDay(iso)
  if (!date) return iso
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Tooltip titles: "1 Jul 2026". */
export function formatDayFull(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = utcDay(iso)
  if (!date) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
