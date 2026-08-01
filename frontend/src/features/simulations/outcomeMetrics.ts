/**
 * The two rate definitions the simulation screens quote, written once.
 *
 * A metric that is defined in the card and again in the detail view drifts, and
 * the day the two disagree is the day nobody trusts either. The denominator
 * here is `resolved`, not `targets`: a person who has not yet been recorded
 * either way is not evidence of anything, and dividing by them would make every
 * campaign look safer the longer it stayed unrecorded.
 */

import type { MetricDefinitionProps } from '../../components/data'

type Definition = Omit<MetricDefinitionProps, 'metric' | 'className'>

export const CLICK_RATE_DEFINITION: Definition = {
  calculation: 'targets recorded as clicked ÷ targets with any recorded outcome',
  includes: ['Targets recorded as clicked'],
  excludes: [
    'Targets still pending — nobody has recorded an outcome for them',
    'Other campaigns; this rate is scoped to this campaign only',
  ],
  caveat:
    'Outcomes are recorded by an analyst. This deployment has no tracked-link delivery, so the rate measures what was observed and entered, not what a mail gateway saw.',
}

export const REPORT_RATE_DEFINITION: Definition = {
  calculation: 'targets recorded as reported ÷ targets with any recorded outcome',
  includes: ['Targets recorded as having reported the lure'],
  excludes: [
    'Targets still pending',
    'Reports of real threats — those live in the human sensor queue, not here',
  ],
  caveat:
    'Reporting is the behaviour worth rewarding, but it is only counted when someone records it against the campaign.',
}

/** What to tell an analyst when a campaign has produced no measurement yet. */
export function unmeasuredRemedy(status: string): string {
  if (status === 'draft') return 'Launch the campaign, then record outcomes as they come in.'
  if (status === 'completed') return 'This campaign closed without a single recorded outcome.'
  return 'Record an outcome against at least one target to start measuring.'
}
