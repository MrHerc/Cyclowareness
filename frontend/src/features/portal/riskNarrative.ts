/**
 * The risk score, turned into sentences a person can check.
 *
 * The employee is the one reader who cannot ask an analyst what a number means,
 * so a bare "47.2" on this screen is worse than useless — it is a judgement with
 * no appeal. Everything here derives from two things the server already sends:
 * the factor breakdown (`baseline + Σ contributions`, revocation-aware) and the
 * recorded events with their reasons. Nothing is invented, and the one derived
 * figure — the previous score — is derived from the score and the most recent
 * recorded change, which is exactly how the engine arrived at the current one.
 */

import type { RiskEvent, RiskFactor } from '../../domain/types'
import { num, riskBand, riskBandLabel } from '../../lib/format'

/** The engine's non-behavioural factor: where every score starts. */
const BASELINE_FACTOR = 'baseline_role_sensitivity'

export interface RiskEvidence {
  current: number
  band: ReturnType<typeof riskBand>
  bandLabel: string
  /** The role-sensitivity starting point. Absent on a breakdown that omits it. */
  baseline: RiskFactor | null
  /** Behaviour that pushed the score up, heaviest first. */
  increasing: RiskFactor[]
  /** Behaviour that pulled it down, heaviest first. */
  reducing: RiskFactor[]
  /** Scoring events behind the breakdown — the sample the score rests on. */
  scoredEvents: number
  /** The most recent events, newest first, exactly as recorded. */
  events: RiskEvent[]
  lastEvent: RiskEvent | null
  /** The score before the most recent recorded change. Null when none exists. */
  previous: number | null
  /** That change, signed. Null when the score has never moved. */
  change: number | null
  /** When the score last moved. Null when it never has. */
  lastRecalculated: string | null
}

function total(factors: RiskFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.contribution, 0)
}

export function buildRiskEvidence(
  current: number,
  breakdown: RiskFactor[] | null | undefined,
  events: RiskEvent[] | null | undefined,
): RiskEvidence {
  const factors = breakdown ?? []
  const behaviour = factors.filter((factor) => factor.factor !== BASELINE_FACTOR)
  const recorded = events ?? []
  const lastEvent = recorded[0] ?? null

  return {
    current,
    band: riskBand(current),
    bandLabel: riskBandLabel(current),
    baseline: factors.find((factor) => factor.factor === BASELINE_FACTOR) ?? null,
    increasing: behaviour
      .filter((factor) => factor.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution),
    reducing: behaviour
      .filter((factor) => factor.contribution < 0)
      .sort((a, b) => a.contribution - b.contribution),
    scoredEvents: behaviour.reduce((sum, factor) => sum + factor.events, 0),
    events: recorded,
    lastEvent,
    previous: lastEvent ? Number((current - lastEvent.delta).toFixed(1)) : null,
    change: lastEvent ? lastEvent.delta : null,
    lastRecalculated: lastEvent ? lastEvent.created_at : null,
  }
}

/** "2 × simulated phish click and 3 × training completed". */
function listFactors(factors: RiskFactor[]): string {
  const phrases = factors.map((factor) => `${factor.events} × ${factor.label.toLowerCase()}`)
  if (phrases.length <= 1) return phrases[0] ?? ''
  return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`
}

/**
 * One paragraph explaining the number, built entirely from the breakdown.
 *
 * Returns null when there is nothing behind the score except the baseline —
 * writing a confident causal sentence about zero events would be the same lie
 * as rendering a rate with no denominator.
 */
export function riskSentence(evidence: RiskEvidence): string | null {
  const clauses: string[] = []
  if (evidence.increasing.length > 0) {
    clauses.push(
      `rose ${num(total(evidence.increasing), 1)} from ${listFactors(evidence.increasing)}`,
    )
  }
  if (evidence.reducing.length > 0) {
    clauses.push(
      `fell ${num(Math.abs(total(evidence.reducing)), 1)} from ${listFactors(evidence.reducing)}`,
    )
  }
  if (clauses.length === 0) return null

  const start = evidence.baseline
    ? `Your score starts at ${num(evidence.baseline.contribution, 1)} for the sensitivity of your role, then `
    : 'Your score '
  return `${start}${clauses.join(', and ')}.`
}

/**
 * What to do about it.
 *
 * Advice, not a measurement — so it is only ever a consequence of facts already
 * on the screen: work waiting on this person, and which band they are in.
 */
export function recommendedAction(
  evidence: RiskEvidence,
  openAssignments: number,
  openIncidentWork: number,
): string {
  if (openIncidentWork > 0) {
    return 'Complete the incident-response work assigned to you before its deadline. It was raised by an analyst and is reviewed by one.'
  }
  if (openAssignments > 0) {
    return 'Complete your assigned training. Completing a module lowers your score, and passing its quiz lowers it further.'
  }
  if (evidence.band === 'high') {
    return 'Nothing is assigned to you right now. Reporting a suspicious message is the fastest thing that lowers your score, and it is the only one available to you today.'
  }
  return 'Nothing is waiting on you. Keep reporting anything that looks wrong — every report you send lowers your score.'
}

/** The one-line cause and effect a completed quiz produces. */
export function riskChangeSentence(delta: number, newScore: number): string {
  if (delta === 0) {
    return `Your risk score did not move. It is still ${num(newScore, 1)}.`
  }
  const direction = delta < 0 ? 'fell' : 'rose'
  return `You completed this, so your risk score ${direction} by ${num(Math.abs(delta), 1)}. It is now ${num(newScore, 1)}.`
}
