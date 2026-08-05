/**
 * What this risk has actually moved.
 *
 * The honest answer is narrower than the question. **Nothing in the platform
 * attributes a risk-score delta to an incident risk**: `RiskEvent` carries a
 * `loop_run_id` and no incident reference, so a score that moved after somebody
 * completed incident-assigned training is indistinguishable from one that moved
 * for any other reason. Inventing a number here — summing the deltas of the
 * subjects' recent events and calling it "this incident's impact" — would be a
 * measurement nobody took, so the panel says so and points at the place the
 * derivation actually lives, each employee's own risk profile.
 *
 * What *is* measured is completion and score against the incident's own pass
 * mark, rolled up from the same subject rows the table above renders.
 */

import { useT } from '../../lib/i18n'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HonestMetric } from '../../components/data'
import { Panel, Progress, Separator } from '../../components/ui'
import type { IncidentRiskDetail } from '../../domain/types'
import type { SubjectRollup } from './vocabulary'

export interface RiskImpactPanelProps {
  risk: IncidentRiskDetail
  rollup: SubjectRollup
}

export function RiskImpactPanel({ risk, rollup }: RiskImpactPanelProps) {
  const t = useT()
  const discharged = rollup.accepted
  // `percent` multiplies by 100 on the way out, so this is a fraction.
  const completionValue = rollup.total > 0 ? discharged / rollup.total : null

  return (
    <Panel headingLevel={2} title={t('x.where-this-stands')}>
      <div className="flex flex-col gap-5">
        <HonestMetric
          label="Obligation discharged"
          value={completionValue}
          format="percent"
          digits={0}
          sample={rollup.total}
          sampleNoun="subject"
          source="live"
          sourceDetail="Counted from the subject rows on this risk"
          tone={completionValue === 1 ? 'safe' : 'neutral'}
          unmeasuredReason="Nobody is attached to this risk yet."
          unmeasuredRemedy="Attach the people the incident named to start measuring."
          definition={{
            calculation:
              'Subjects whose completion a reviewer accepted, divided by the subjects attached to this risk.',
            includes: ['Subjects a reviewer marked accepted'],
            excludes: [
              'Subjects who completed but have not been reviewed',
              'Subjects a reviewer rejected',
            ],
            caveat:
              'Completion is not the same as competence. The score below is what evidences that.',
          }}
        />

        <Progress
          label="Subjects accepted"
          value={rollup.total > 0 ? discharged : null}
          max={Math.max(rollup.total, 1)}
          showLabel
          showValue
          tone={discharged === rollup.total && rollup.total > 0 ? 'safe' : 'brand'}
        />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Not started" value={rollup.assigned} />
          <Stat label="Awaiting review" value={rollup.awaitingReview} tone={rollup.awaitingReview > 0 ? 'text-medium' : undefined} />
          <Stat label="Rejected" value={rollup.rejected} tone={rollup.rejected > 0 ? 'text-high' : undefined} />
          <Stat label="Nothing assigned" value={rollup.unattached} tone={rollup.unattached > 0 ? 'text-medium' : undefined} />
        </dl>

        <Separator fade />

        <HonestMetric
          label="Average score"
          value={rollup.avgScore}
          format="number"
          digits={0}
          sample={rollup.scored}
          sampleNoun="scored subject"
          source="live"
          sourceDetail="Quiz scores recorded against this incident's assignments"
          tone={
            risk.min_score !== null && rollup.avgScore !== null && rollup.avgScore < risk.min_score
              ? 'high'
              : 'neutral'
          }
          unmeasuredReason="No subject has recorded a score yet."
          unmeasuredRemedy="A score appears once somebody submits a quiz on the assigned module."
          hint={
            risk.min_score !== null
              ? `This incident's bar is ${risk.min_score}%. The quiz grader does not apply it — the reviewer does.`
              : 'No pass mark was set on this incident.'
          }
        />

        {rollup.belowPassMark !== null && rollup.belowPassMark > 0 && (
          <p className="rounded-control border border-high/35 bg-high/12 px-3 py-2 text-sm text-high">
            {rollup.belowPassMark} of {rollup.scored} recorded{' '}
            {rollup.scored === 1 ? 'score is' : 'scores are'} below this incident&rsquo;s{' '}
            {risk.min_score}% bar. A reviewer has to decide what that means — the grader passed them
            at its own lower threshold.
          </p>
        )}

        <Separator fade />

        <section>
          <h3 className="label text-fg-subtle">{t('y.riskscore-impact')}</h3>
          <p className="mt-1.5 text-sm text-fg-muted">
            The platform does not attribute a risk-score change to an incident risk. Risk events
            record the loop run that caused them and carry no incident reference, so no honest
            number can be shown here. Each subject&rsquo;s score and its derivation live on their own
            profile.
          </p>
          {risk.subjects.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {risk.subjects.slice(0, 6).map((subject) => (
                <li key={subject.id}>
                  <Link
                    to={`/employees/${subject.employee_id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                  >
                    {subject.employee_name ?? `Employee ${subject.employee_id}`}
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {risk.subjects.length > 6 && (
                <li className="text-xs text-fg-faint">
                  and {risk.subjects.length - 6} more in the subjects table.
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className={tone ?? 'text-fg'}>
        <span className="text-lead tabular-nums">{value}</span>
      </dd>
    </div>
  )
}
