/**
 * Confidence thresholds, in one place, so a chart and a badge never disagree.
 *
 * Apart from the component that renders them because Fast Refresh only works
 * when a module exports components alone — a file that also exports a constant
 * or a helper falls back to a full reload on every edit.
 */

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'very_low'

export function confidenceBand(value: number): ConfidenceBand {
  if (value >= 0.85) return 'high'
  if (value >= 0.6) return 'moderate'
  if (value >= 0.35) return 'low'
  return 'very_low'
}
