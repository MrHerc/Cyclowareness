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
  /** EVERY starting position, including the role baseline — where the score
   *  began, before anything the person did. Shown so the arithmetic still
   *  reconciles on screen: removing these from the behaviour columns without
   *  displaying them would leave the total unexplained, which is the one thing
   *  this panel exists not to do. */
  startingPoints: RiskFactor[]
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
  /** True when the newest record is a WITHDRAWN one.
   *
   *  A revocation changes the score and is not itself an event, so "since your
   *  last recorded change" cannot describe it: after a contest was upheld the
   *  score had fallen 86 to 74 while the delta beside it read "+12.0, worse
   *  than the previous period" — the movement that had just been taken back.
   *  The panel shows no delta at all in that state rather than a wrong one. */
  lastMovementUnexplained: boolean
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
  // A STARTING POSITION IS NOT SOMETHING THEY DID. The columns below are headed
  // "What is raising it" / "What is lowering it", and the empty state of the
  // first reads "No BEHAVIOUR has pushed your score up" — so anything that is
  // not behaviour must not appear there. `baseline_assessment`, the figure
  // carried over from before the platform, did: on the demo roster it is
  // present for all 26 people, reaches 43 points of 100, and was the largest
  // single entry for several of them, on the one screen where a named person is
  // told why they are considered a risk.
  //
  // Grouped on the server's `kind` when it sends one, falling back to the old
  // name check so a deployment that predates the field still separates the
  // role-sensitivity baseline.
  const isStartingPoint = (factor: RiskFactor) =>
    factor.kind ? factor.kind === 'starting_point' : factor.factor === BASELINE_FACTOR
  const behaviour = factors.filter((factor) => !isStartingPoint(factor))
  const recorded = events ?? []
  // A WITHDRAWN CLAIM IS NOT THE LAST CHANGE. `previous` and `change` are
  // derived from the newest event, and after a contest was upheld the newest
  // event was the revoked one — so a score that had just fallen 86 to 74
  // reported "+12.0, worse than the previous period", describing the movement
  // that had been taken back rather than the one that happened.
  //
  // The row stays visible, struck through and explained; it simply stops being
  // treated as evidence of a movement.
  const lastEvent = recorded.find((event) => !event.revoked_at) ?? null
  const lastMovementUnexplained = Boolean(recorded[0]?.revoked_at)

  return {
    current,
    band: riskBand(current),
    bandLabel: riskBandLabel(current),
    baseline: factors.find((factor) => factor.factor === BASELINE_FACTOR) ?? null,
    startingPoints: factors.filter(isStartingPoint),
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
    lastMovementUnexplained,
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

  // THE SENTENCE HAS TO RECONCILE TOO. It opened with the role-sensitivity
  // baseline alone while the behaviour clauses used to include the figure
  // carried over from before the platform. Excluding that from behaviour without
  // adding it here would leave the arithmetic short by up to 43 points and the
  // person reading it unable to add up their own score.
  const startTotal = total(evidence.startingPoints)
  const carried = evidence.startingPoints.filter(
    (factor) => factor !== evidence.baseline,
  )
  const start =
    evidence.startingPoints.length === 0
      ? 'Your score '
      : carried.length > 0
        ? `Your score starts at ${num(startTotal, 1)} — the sensitivity of your role plus a figure carried over from before this platform — then `
        : `Your score starts at ${num(startTotal, 1)} for the sensitivity of your role, then `
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
