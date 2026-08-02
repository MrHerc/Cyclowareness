/**
 * The six human-behaviour figures, four measured and two not.
 *
 * Average reporting time and quiz pass rate are rendered as absent on purpose.
 * The platform holds the raw material for both — simulation targets carry an
 * outcome timestamp, assignments carry a score — but no endpoint aggregates
 * either one, and computing them in the browser from partial data would put a
 * number on this page that nothing on the server could reproduce. Each says
 * what would make it measurable instead.
 *
 * Every comparison comes from `previousPeriod`, which reads a real snapshot one
 * window back or refuses. There is no arithmetic here that manufactures a
 * baseline.
 */

import { HonestMetric } from '../../components/data'
import { Panel } from '../../components/ui'
import type { Metrics, TrendPoint } from '../../domain/types'
import { previousPeriod } from './derive'

export interface PostureMetricsProps {
  metrics: Metrics
  trend: TrendPoint[]
  /** People on a scored roster — the denominator behind the organisation average. */
  headcount: number
  /** ISO timestamp of the last successful refresh. */
  updatedAt: string | null
}

export function PostureMetrics({ metrics, trend, headcount, updatedAt }: PostureMetricsProps) {
  const window = metrics.window_days

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Panel>
        <HonestMetric
          label="Click rate"
          value={metrics.phishing_click_rate}
          format="percent"
          sample={metrics.simulation_sample}
          sampleNoun="resolved simulation outcomes"
          windowDays={window}
          source="live"
          sourceDetail="Platform API"
          lastUpdated={updatedAt}
          tone={metrics.phishing_click_rate !== null && metrics.phishing_click_rate > 0.1 ? 'high' : 'neutral'}
          comparison={previousPeriod(trend, 'phishing_click_rate', window, 'down')}
          hint="The share of people who acted on a simulated lure."
          unmeasuredReason={`fewer than ${metrics.min_sample} simulation outcomes resolved in the last ${window} days`}
          unmeasuredRemedy="Launch a simulation. The rate is withheld rather than estimated because one click out of two is not a 50% click rate."
          definition={{
            calculation: 'Clicked targets divided by every simulation target that reached an outcome.',
            includes: ['Targets that clicked, reported, or ignored a delivered lure'],
            excludes: ['Targets still pending an outcome', 'Real threats — these are simulations only'],
            caveat: `Withheld below ${metrics.min_sample} resolved outcomes in the window.`,
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label="Reporting rate"
          value={metrics.report_rate}
          format="percent"
          sample={metrics.simulation_sample}
          sampleNoun="resolved simulation outcomes"
          windowDays={window}
          source="live"
          sourceDetail="Platform API"
          lastUpdated={updatedAt}
          tone={metrics.report_rate !== null && metrics.report_rate >= 0.5 ? 'safe' : 'neutral'}
          comparison={previousPeriod(trend, 'report_rate', window, 'up')}
          hint="The share who recognised a lure and said so. This is the human sensor."
          unmeasuredReason={`fewer than ${metrics.min_sample} simulation outcomes resolved in the last ${window} days`}
          unmeasuredRemedy="Launch a simulation. Reporting is the only behaviour on this page that improves detection rather than just avoiding harm."
          definition={{
            calculation: 'Targets who reported divided by every target that reached an outcome.',
            includes: ['Reports made through the human-sensor path against a simulated lure'],
            excludes: ['Reports of genuine threats, which have no delivered denominator'],
            caveat: 'Shares a denominator with the click rate, so the two are directly comparable.',
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label="Average reporting time"
          value={null}
          format="duration"
          sample={0}
          sampleNoun="timed reports"
          windowDays={window}
          source="live"
          sourceDetail="Platform API"
          unmeasuredReason="no endpoint reports the interval between delivery and report"
          unmeasuredRemedy="Campaigns record a launch time and targets record an outcome time, but nothing exposes the elapsed time between them. This figure appears when the platform aggregates it — it is not estimated here."
          definition={{
            calculation: 'Would be the median time from lure delivery to the report being filed.',
            excludes: ['Everything — the platform does not currently compute this'],
            caveat: 'Rendered as absent rather than derived in the browser from partial data.',
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label="Average behaviour risk"
          value={metrics.avg_behaviour_risk}
          format="score"
          digits={1}
          sample={headcount}
          sampleNoun="people on a scored roster"
          source="live"
          sourceDetail="Risk engine — behaviour only"
          lastUpdated={updatedAt}
          tone={
            metrics.avg_behaviour_risk === null
              ? 'neutral'
              : metrics.avg_behaviour_risk >= 60
                ? 'critical'
                : metrics.avg_behaviour_risk >= 40
                  ? 'medium'
                  : 'safe'
          }
          comparison={previousPeriod(trend, 'avg_behaviour_risk', window, 'down')}
          hint="Zero to 100. Lower is safer. A point-in-time property of the roster, not a windowed rate."
          unmeasuredReason="no employee currently carries a score"
          unmeasuredRemedy="Scores appear once the risk engine has recorded at least one event against a person."
          definition={{
            calculation:
              'The mean behaviour-risk score across active employees: role baseline plus what each person did when a threat reached them.',
            includes: ['Simulation clicks and reports, real-threat reports, incident findings'],
            excludes: [
              'Training completion and quiz scores — those move training credit, not this',
              'Employees who have left',
              'Any trailing window — this is the score as it stands now',
            ],
            caveat:
              'This is the only risk figure that may be read as evidence the programme works. The composite score also falls when training is merely completed, so a fall in the composite can mean nothing more than that modules were assigned.',
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label="Training completion"
          value={metrics.training_completion_rate}
          format="percent"
          sample={metrics.training_sample}
          sampleNoun="assignments"
          windowDays={window}
          source="live"
          sourceDetail="Platform API"
          lastUpdated={updatedAt}
          comparison={previousPeriod(trend, 'training_completion_rate', window, 'up')}
          hint="Attendance, not behaviour change. Read it as the floor under the two rates above."
          unmeasuredReason={`fewer than ${metrics.min_sample} assignments were made in the last ${window} days`}
          unmeasuredRemedy="Carry a threat through the loop, or assign training from a policy finding, and completion becomes measurable."
          definition={{
            calculation: 'Completed assignments divided by assignments made in the window.',
            includes: ['Every assignment created in the window, whatever created it'],
            excludes: ['Assignments made before the window, even if completed inside it'],
            caveat: 'A high completion rate is not evidence of changed behaviour. The click and report rates are.',
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label="Quiz pass rate"
          value={null}
          format="percent"
          sample={0}
          sampleNoun="graded quizzes"
          windowDays={window}
          source="live"
          sourceDetail="Platform API"
          unmeasuredReason="no endpoint aggregates quiz scores into a pass rate"
          unmeasuredRemedy="Each completed assignment carries its own score against a pass mark, but the dashboard reports completion only. This figure appears when the platform aggregates those scores."
          definition={{
            calculation: 'Would be graded quizzes at or above the pass mark, divided by graded quizzes.',
            excludes: ['Everything — the platform does not currently compute this'],
            caveat: 'Not derived from the per-assignment scores in the browser, because this view cannot see all of them.',
          }}
        />
      </Panel>
    </div>
  )
}
