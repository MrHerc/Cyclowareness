/**
 * A measured number, and everything a reader needs to judge it.
 *
 * This is the product's conscience in one component. Three behaviours are not
 * configurable, because each one is a lie this codebase has decided never to
 * tell:
 *
 * 1. **`null` is not zero.** A rate the backend could not measure renders as
 *    "Not measured", never as `0%`. Rounding "we do not know" down to "nothing
 *    happened" always flatters the vendor, which is exactly why it happens.
 * 2. **Sample size and window are always visible.** Not in a tooltip, not on
 *    hover. One click out of two is 50%, and so is fifty out of a hundred.
 * 3. **No arrow without two real periods.** When a comparison is asked for and
 *    cannot be drawn, it says "Trend unavailable" and why — a green arrow that
 *    means "we had nothing to compare against" is worse than no arrow.
 *
 * Renders unstyled — no panel, no background. The caller's card supplies the
 * chrome so this composes into any surface without fighting it.
 */

import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn, duration, num, pct, signed } from '../../lib/format'
import { ConfidenceBadge } from './ConfidenceBadge'
import { DataSourceLabel, type DataSource } from './DataSourceLabel'
import { formatRangeLabel } from './dateRange'
import { LastUpdated } from './LastUpdated'
import { MetricDefinition, type MetricDefinitionProps } from './MetricDefinition'
import { NoMeasurement } from './NoMeasurement'
import { SampleSizeLabel } from './SampleSizeLabel'

/** `duration` values are **seconds** — matching the backend's `*_seconds` fields. */
export type MetricFormat = 'percent' | 'number' | 'score' | 'duration'

export type MetricTone = 'neutral' | 'brand' | 'critical' | 'high' | 'medium' | 'low' | 'safe'

export interface MetricComparison {
  /** The previous period's value. `null` when that period was not measured either. */
  previous: number | null
  /**
   * False when the two periods cannot be compared at all — a changed definition,
   * a shorter window, a different population. `reason` is then required.
   */
  valid: boolean
  /** Why no trend can be drawn. Shown verbatim in place of the arrow. */
  reason?: string
  /** Names the baseline: "vs previous 30 days". */
  label?: string
  /**
   * Which direction is an improvement. Omit and the delta stays neutral — a
   * falling completion rate and a falling click rate are not the same news, and
   * this component will not guess which one it is looking at.
   */
  improvement?: 'up' | 'down'
}

export interface HonestMetricProps {
  /** Sentence case. Also names the metric in its definition popover. */
  label: string
  /** `null` means not measured. It is rendered as such, never as 0. */
  value: number | null
  format: MetricFormat
  /** How many resolved events the value was computed from. Always rendered. */
  sample: number
  /** Plural noun for the sample: "delivered simulations", "completed assignments". */
  sampleNoun: string
  /** Trailing window. Give this or `range`; `range` wins when both are present. */
  windowDays?: number
  /** Explicit inclusive range, `YYYY-MM-DD` — from `DateRangeSelector`. */
  range?: { from: string; to: string }
  source?: DataSource
  /** Names the specific origin: the feed, the dataset, the analyzer. */
  sourceDetail?: string
  /** ISO timestamp of the last refresh. */
  lastUpdated?: string | null
  /** 0..1. Pass `null` to state plainly that none was reported. */
  confidence?: number | null
  comparison?: MetricComparison
  /** Colours the figure. Risk hues only where the number genuinely is a risk. */
  tone?: MetricTone
  /** One short sentence of context under the caption. */
  hint?: string
  /** Opens an info popover beside the label. `metric` is taken from `label`. */
  definition?: Omit<MetricDefinitionProps, 'metric' | 'className'>
  /** Why there is no measurement. Required in practice whenever `value` is null. */
  unmeasuredReason?: string
  /** What would produce one: "launch a campaign to start measuring". */
  unmeasuredRemedy?: string
  /** Decimal places. Sensible per-format defaults otherwise. */
  digits?: number
  className?: string
}

const TONE_CLASS: Record<MetricTone, string> = {
  neutral: 'text-fg',
  brand: 'text-brand',
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  safe: 'text-safe',
}

function formatValue(value: number, format: MetricFormat, digits: number | undefined): string {
  switch (format) {
    case 'percent':
      return pct(value, digits ?? 0)
    case 'duration':
      return duration(value * 1000)
    case 'score':
      return num(value, digits ?? 0)
    case 'number':
      return num(value, digits ?? 0)
  }
}

/**
 * Percentage deltas are stated in percentage points. "Click rate fell 20%" is
 * ambiguous between 25%→5% and 25%→20%; "fell 5 pp" is not.
 */
function formatDelta(delta: number, format: MetricFormat, digits: number | undefined): string {
  if (format === 'percent') return `${signed(delta * 100, digits ?? 1)} pp`
  if (format === 'duration') return `${delta >= 0 ? '+' : '-'}${duration(Math.abs(delta) * 1000)}`
  return signed(delta, digits ?? 1)
}

type ComparisonState =
  | { kind: 'delta'; delta: number }
  | { kind: 'unavailable'; reason: string }

function comparisonState(value: number | null, comparison: MetricComparison): ComparisonState {
  if (!comparison.valid) {
    return { kind: 'unavailable', reason: comparison.reason ?? 'the periods are not comparable' }
  }
  if (value === null) {
    return { kind: 'unavailable', reason: comparison.reason ?? 'this period has no measurement' }
  }
  if (comparison.previous === null) {
    return { kind: 'unavailable', reason: comparison.reason ?? 'the previous period has no measurement' }
  }
  return { kind: 'delta', delta: value - comparison.previous }
}

function Comparison({
  state,
  comparison,
  format,
  digits,
}: {
  state: ComparisonState
  comparison: MetricComparison
  format: MetricFormat
  digits: number | undefined
}) {
  if (state.kind === 'unavailable') {
    return <span className="text-xs text-fg-faint">Trend unavailable — {state.reason}</span>
  }

  const direction = state.delta > 0 ? 'up' : state.delta < 0 ? 'down' : 'flat'
  const tone =
    comparison.improvement && direction !== 'flat'
      ? direction === comparison.improvement
        ? 'text-safe'
        : 'text-critical'
      : 'text-fg-muted'
  const Icon = direction === 'up' ? TrendingUp : TrendingDown

  // WHETHER THIS IS GOOD NEWS WAS CARRIED ONLY BY HUE — green for better, red
  // for worse, with the arrow saying only which way the number moved. A reader
  // who cannot separate the two colours got the magnitude and the direction and
  // not the judgement, which is the part that matters. Said in words too.
  const judgement =
    comparison.improvement && direction !== 'flat'
      ? direction === comparison.improvement
        ? 'an improvement'
        : 'worse than the previous period'
      : null

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', tone)}>
      {direction === 'flat' ? null : <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {direction === 'flat' ? 'No change' : formatDelta(state.delta, format, digits)}
      {judgement ? <span className="sr-only"> — {judgement}</span> : null}
      {comparison.label ? <span className="text-xs text-fg-faint">{comparison.label}</span> : null}
    </span>
  )
}

function Dot() {
  return (
    <span className="text-fg-faint" aria-hidden="true">
      ·
    </span>
  )
}

export function HonestMetric({
  label,
  value,
  format,
  sample,
  sampleNoun,
  windowDays,
  range,
  source,
  sourceDetail,
  lastUpdated,
  confidence,
  comparison,
  tone = 'neutral',
  hint,
  definition,
  unmeasuredReason,
  unmeasuredRemedy,
  digits,
  className,
}: HonestMetricProps) {
  // NaN and Infinity reach the UI through division by an empty denominator.
  // They are the same fact as `null` — nothing was measured — so they are folded
  // into it here rather than rendered as "NaN%".
  const measured = value !== null && Number.isFinite(value) ? value : null
  const state = comparison ? comparisonState(measured, comparison) : null

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1.5">
        <span className="label text-fg-subtle">{label}</span>
        {definition ? <MetricDefinition metric={label} {...definition} /> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {measured !== null ? (
          <span className={cn('text-display', TONE_CLASS[tone])}>
            {formatValue(measured, format, digits)}
          </span>
        ) : (
          <NoMeasurement reason={unmeasuredReason} className="text-lead" />
        )}
        {state && comparison ? (
          <Comparison state={state} comparison={comparison} format={format} digits={digits} />
        ) : null}
      </div>

      {measured === null && unmeasuredRemedy ? (
        <p className="mt-1.5 text-sm text-fg-subtle">{unmeasuredRemedy}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <SampleSizeLabel
          sample={sample}
          noun={sampleNoun}
          windowDays={range ? undefined : windowDays}
        />
        {range ? (
          <>
            <Dot />
            <span className="text-xs text-fg-faint">{formatRangeLabel(range.from, range.to)}</span>
          </>
        ) : null}
        {source ? (
          <>
            <Dot />
            <DataSourceLabel source={source} detail={sourceDetail} />
          </>
        ) : null}
        {lastUpdated !== undefined ? (
          <>
            <Dot />
            <LastUpdated at={lastUpdated} />
          </>
        ) : null}
        {confidence !== undefined ? (
          <>
            <Dot />
            <ConfidenceBadge value={confidence} />
          </>
        ) : null}
      </div>

      {hint ? <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  )
}
