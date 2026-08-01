/**
 * A 0..1 confidence rendered as a band, never as a bare decimal.
 *
 * "0.62" invites arithmetic that the number cannot support — it is a model's
 * self-report, not a probability anyone measured. A band says how much weight to
 * put on the claim without implying two decimal places of precision. The exact
 * figure stays available on hover for the analyst who wants it.
 *
 * Deliberately not coloured with the risk hues: low confidence in a benign
 * verdict is not a risk, and painting it amber would say it was.
 */

import { cn } from '../../lib/format'
import { Tip } from './Tip'

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'very_low'

/** The thresholds, in one place, so a chart and a badge never disagree. */
export function confidenceBand(value: number): ConfidenceBand {
  if (value >= 0.85) return 'high'
  if (value >= 0.6) return 'moderate'
  if (value >= 0.35) return 'low'
  return 'very_low'
}

const BANDS: Record<ConfidenceBand, { label: string; tone: string }> = {
  high: { label: 'High confidence', tone: 'text-fg border-line-strong' },
  moderate: { label: 'Moderate confidence', tone: 'text-fg-muted border-line' },
  low: { label: 'Low confidence', tone: 'text-fg-subtle border-line' },
  very_low: { label: 'Very low confidence', tone: 'text-fg-faint border-line-subtle' },
}

export interface ConfidenceBadgeProps {
  /** On a 0..1 scale. `null` means the producer did not state one. */
  value: number | null | undefined
  className?: string
}

export function ConfidenceBadge({ value, className }: ConfidenceBadgeProps) {
  const chip = 'inline-flex items-center rounded-chip border px-2 py-0.5 text-xs'

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <Tip content="Whatever produced this did not report a confidence, so none is shown.">
        <span className={cn(chip, 'border-line-subtle text-fg-faint', className)}>
          Confidence not stated
        </span>
      </Tip>
    )
  }

  // Out-of-range input is a caller bug, not a fact about the data. Band on the
  // clamped value but show the raw figure, so the mistake is visible rather than
  // silently rounded into a confident-looking badge.
  const clamped = Math.min(1, Math.max(0, value))
  const band = BANDS[confidenceBand(clamped)]

  return (
    <Tip content={`Reported confidence ${value.toFixed(2)} on a 0–1 scale.`}>
      <span className={cn(chip, band.tone, className)}>{band.label}</span>
    </Tip>
  )
}
