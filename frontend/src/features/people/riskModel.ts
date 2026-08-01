/**
 * The risk model, described for a reader — not re-implemented for one.
 *
 * Every score in this product is computed on the server by
 * `backend/app/core/risk_engine.py`. Nothing here recomputes it. What lives in
 * this file is (a) the vocabulary needed to explain a number the server already
 * sent, and (b) arithmetic that only rearranges values the server sent.
 *
 * The weights table is the one thing here that is a *copy* of a server constant.
 * It is presented in the UI as what it is — the documented model constants, not
 * a measurement — because a page that claims to answer "where does this number
 * come from" cannot do so while hiding the coefficients. If the engine's table
 * changes, this one has to change with it; that is the price of the page
 * existing at all, and it is cheaper than the alternative, which is an
 * explanation nobody can check.
 */

import type { Employee, RiskFactor } from '../../domain/types'

/* ============================================================================
   The baseline
   ========================================================================== */

/** `baseline = 20 + role_sensitivity × 20`, exactly as the engine computes it. */
export function baselineFor(roleSensitivity: number): number {
  return Math.round((20 + roleSensitivity * 20) * 10) / 10
}

/**
 * The part of a score that recorded behaviour is responsible for.
 *
 * Derived, not measured separately: the engine defines
 * `score = baseline + Σ(deltas)`, so the difference *is* the sum of the deltas.
 */
export function behaviourOf(employee: Pick<Employee, 'current_risk_score' | 'role_sensitivity'>): number {
  return Math.round((employee.current_risk_score - baselineFor(employee.role_sensitivity)) * 10) / 10
}

/* ============================================================================
   The signals
   ========================================================================== */

export type SignalDirection = 'raises' | 'lowers' | 'neutral' | 'variable'

export interface SignalSpec {
  /** The `type` on a RiskEvent and the `factor` on a RiskFactor. */
  key: string
  label: string
  /** What has to happen for the engine to write this event. */
  meaning: string
  /** The documented coefficient. `null` where the delta is not a constant. */
  weight: number | null
  /** Shown where `weight` alone would misdescribe the signal. */
  weightNote?: string
  direction: SignalDirection
}

/**
 * Mirrors `WEIGHTS` in `backend/app/core/risk_engine.py`, plus the two entries
 * that are not constants (`manual_adjustment`) or not signals at all
 * (`baseline_role_sensitivity`).
 */
export const SIGNALS: SignalSpec[] = [
  {
    key: 'baseline_role_sensitivity',
    label: 'Role sensitivity baseline',
    meaning:
      'Where the score starts before anything happens, from how much damage this role could do: 20 + role sensitivity × 20.',
    weight: null,
    weightNote: '20 + sensitivity × 20',
    direction: 'neutral',
  },
  {
    key: 'simulated_phish_click',
    label: 'Clicked a simulated phish',
    meaning: 'Interacted with a lure in a controlled campaign. The strongest single signal in the model.',
    weight: 12,
    direction: 'raises',
  },
  {
    key: 'simulated_phish_report',
    label: 'Reported a simulated phish',
    meaning: 'Recognised a campaign lure and reported it instead of acting on it.',
    weight: -5,
    direction: 'lowers',
  },
  {
    key: 'real_threat_report',
    label: 'Reported a real threat',
    meaning: 'Sent a genuinely suspicious artifact to the analyst queue. This is the human sensor working.',
    weight: -4,
    direction: 'lowers',
  },
  {
    key: 'real_threat_exposure',
    label: 'Was reached by a real threat',
    meaning:
      'The artifact actually arrived at this person. Recorded because it justifies training them — deliberately scored at zero, so that being mailed something cannot raise anyone’s score.',
    weight: 0,
    direction: 'neutral',
  },
  {
    key: 'training_completed',
    label: 'Completed training',
    meaning: 'Base credit for finishing an assigned module.',
    weight: -4,
    direction: 'lowers',
  },
  {
    key: 'training_comprehension',
    label: 'Training comprehension',
    meaning: 'Additional credit on top of completion, scaled by the quiz score. A perfect quiz earns the full amount.',
    weight: -6,
    weightNote: '-6 × (quiz score ÷ 100)',
    direction: 'variable',
  },
  {
    key: 'training_failed',
    label: 'Failed the quiz',
    meaning: 'Finished the module but scored below 60%. Attendance without comprehension.',
    weight: 3,
    direction: 'raises',
  },
  {
    key: 'training_ignored',
    label: 'Ignored the assignment',
    meaning: 'The assignment expired without being completed.',
    weight: 4,
    direction: 'raises',
  },
  {
    key: 'manual_adjustment',
    label: 'Analyst adjustment',
    meaning: 'A human overrode the model. The engine requires a written reason, which is shown on the event.',
    weight: null,
    weightNote: 'Set by the analyst',
    direction: 'variable',
  },
]

const BY_KEY = new Map(SIGNALS.map((signal) => [signal.key, signal]))

export function signalFor(key: string): SignalSpec | undefined {
  return BY_KEY.get(key)
}

/** The scoring signals only — the baseline is not one of them. */
export const SCORING_SIGNALS: SignalSpec[] = SIGNALS.filter(
  (signal) => signal.key !== 'baseline_role_sensitivity',
)

/* ============================================================================
   Rearranging what the server sent
   ========================================================================== */

/**
 * Sum of every contribution in a breakdown.
 *
 * The engine's invariant is that this equals `current_risk_score`. The pages
 * render both numbers rather than assuming it, because an explanation that
 * silently papers over a mismatch is worth nothing.
 */
export function breakdownTotal(breakdown: RiskFactor[]): number {
  return Math.round(breakdown.reduce((sum, factor) => sum + factor.contribution, 0) * 10) / 10
}

export interface TrailPoint {
  at: string
  score: number
}

/** Only the two fields the reconstruction needs — risk events and dashboard rows both fit. */
export interface DeltaEvent {
  delta: number
  created_at: string
}

/**
 * The score after each of the events the server returned, oldest first.
 *
 * Reconstructed by unwinding the deltas from the current score. This is sound
 * because the engine records the delta it *applied*, not the one it wanted to
 * apply — at the 0 and 100 rails the two differ, and recording the applied one
 * is what keeps `baseline + Σ(deltas)` reconcilable by hand.
 *
 * `events` must be newest first, which is the order the API returns.
 */
export function scoreTrail(
  currentScore: number,
  events: ReadonlyArray<DeltaEvent>,
): TrailPoint[] {
  const points: TrailPoint[] = []
  let score = currentScore
  for (const event of events) {
    points.push({ at: event.created_at, score: Math.round(score * 10) / 10 })
    score -= event.delta
  }
  return points.reverse()
}

/** Net movement across a set of events. `null` when there were none. */
export function netMovement(events: ReadonlyArray<DeltaEvent>): number | null {
  if (events.length === 0) return null
  return Math.round(events.reduce((sum, event) => sum + event.delta, 0) * 10) / 10
}

/* ============================================================================
   Distribution
   ========================================================================== */

export type Band = 'low' | 'elevated' | 'high'

export const BAND_ORDER: Band[] = ['high', 'elevated', 'low']

export const BAND_TEXT: Record<Band, string> = {
  high: 'text-critical',
  elevated: 'text-medium',
  low: 'text-safe',
}

export const BAND_FILL: Record<Band, string> = {
  high: 'bg-critical',
  elevated: 'bg-medium',
  low: 'bg-safe',
}

export const BAND_BORDER: Record<Band, string> = {
  high: 'border-critical/40',
  elevated: 'border-medium/40',
  low: 'border-safe/40',
}

/** The thresholds `riskBand()` applies, spelled out for the reader. */
export const BAND_RANGE: Record<Band, string> = {
  high: '60 – 100',
  elevated: '40 – 59',
  low: '0 – 39',
}

export interface HistogramBucket {
  /** Inclusive lower bound. */
  from: number
  /** Exclusive upper bound, except the last bucket. */
  to: number
  count: number
  band: Band
}

/** Ten-point buckets across the whole 0–100 range, so empty ones stay visible. */
export function scoreHistogram(scores: number[]): HistogramBucket[] {
  const buckets: HistogramBucket[] = []
  for (let from = 0; from < 100; from += 10) {
    const to = from + 10
    buckets.push({
      from,
      to,
      count: 0,
      band: from >= 60 ? 'high' : from >= 40 ? 'elevated' : 'low',
    })
  }
  for (const score of scores) {
    const index = Math.min(9, Math.max(0, Math.floor(score / 10)))
    const bucket = buckets[index]
    if (bucket) bucket.count += 1
  }
  return buckets
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}
