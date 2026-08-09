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

import { useT } from '../../lib/i18n'
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
  const t = useT()
  const window = metrics.window_days

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Panel>
        <HonestMetric
          label={t('u.click-rate')}
          value={metrics.phishing_click_rate}
          format="percent"
          sample={metrics.simulation_sample}
          sampleNoun={t('u.resolved-simulation-outcomes')}
          windowDays={window}
          source="live"
          sourceDetail={t('u.platform-api')}
          lastUpdated={updatedAt}
          tone={metrics.phishing_click_rate !== null && metrics.phishing_click_rate > 0.1 ? 'high' : 'neutral'}
          comparison={previousPeriod(trend, 'phishing_click_rate', window, 'down')}
          hint={t('p.the-share-of-people-who-acted')}
          unmeasuredReason={`fewer than ${metrics.min_sample} simulation outcomes resolved in the last ${window} days`}
          unmeasuredRemedy="Launch a simulation. The rate is withheld rather than estimated because one click out of two is not a 50% click rate."
          definition={{
            calculation: t('p.clicked-targets-divided-by-every-simulation'),
            includes: [t('u.def-targets-clicked-reported-ignored')],
            excludes: [t('u.def-targets-pending'), t('u.def-real-threats-excluded')],
            caveat: `Withheld below ${metrics.min_sample} resolved outcomes in the window.`,
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label={t('p.reporting-rate')}
          value={metrics.report_rate}
          format="percent"
          sample={metrics.simulation_sample}
          sampleNoun={t('u.resolved-simulation-outcomes')}
          windowDays={window}
          source="live"
          sourceDetail={t('u.platform-api')}
          lastUpdated={updatedAt}
          tone={metrics.report_rate !== null && metrics.report_rate >= 0.5 ? 'safe' : 'neutral'}
          comparison={previousPeriod(trend, 'report_rate', window, 'up')}
          hint={t('p.the-share-who-recognised-a-lure')}
          unmeasuredReason={`fewer than ${metrics.min_sample} simulation outcomes resolved in the last ${window} days`}
          unmeasuredRemedy="Launch a simulation. Reporting is the only behaviour on this page that improves detection rather than just avoiding harm."
          definition={{
            calculation: t('p.targets-who-reported-divided-by-every'),
            includes: [t('u.def-reports-human-sensor-sim')],
            excludes: [t('u.def-reports-genuine-threats')],
            caveat: t('p.shares-a-denominator-with-the-click'),
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label={t('p.average-reporting-time')}
          value={null}
          format="duration"
          sample={0}
          sampleNoun={t('u.timed-reports')}
          windowDays={window}
          source="live"
          sourceDetail={t('u.platform-api')}
          unmeasuredReason={t('u.no-endpoint-reports-the-interval-between-delivery')}
          unmeasuredRemedy="Campaigns record a launch time and targets record an outcome time, but nothing exposes the elapsed time between them. This figure appears when the platform aggregates it — it is not estimated here."
          definition={{
            calculation: t('p.would-be-the-median-time-from'),
            excludes: [t('u.def-platform-does-not-compute')],
            caveat: t('p.rendered-as-absent-rather-than-derived'),
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label={t('p.average-behaviour-risk')}
          value={metrics.avg_behaviour_risk}
          format="score"
          digits={1}
          sample={headcount}
          sampleNoun={t('u.people-on-a-scored-roster')}
          source="live"
          sourceDetail={t('u.risk-engine-behaviour-only')}
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
          hint={t('p.zero-to-100-lower-is-safer')}
          unmeasuredReason={t('u.no-employee-currently-carries-a-score')}
          unmeasuredRemedy="Scores appear once the risk engine has recorded at least one event against a person."
          definition={{
            calculation:
              t('p.the-mean-behaviourrisk-score-across-active'),
            includes: [t('u.def-sim-clicks-reports-incidents')],
            excludes: [
              t('u.def-training-completion-moves-credit'),
              t('u.def-employees-who-left'),
              t('u.def-no-trailing-window-score'),
            ],
            caveat:
              t('p.this-is-the-only-risk-figure'),
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label={t('p.training-completion')}
          value={metrics.training_completion_rate}
          format="percent"
          sample={metrics.training_sample}
          sampleNoun="assignments"
          windowDays={window}
          source="live"
          sourceDetail={t('u.platform-api')}
          lastUpdated={updatedAt}
          comparison={previousPeriod(trend, 'training_completion_rate', window, 'up')}
          hint={t('p.attendance-not-behaviour-change-read-it')}
          unmeasuredReason={`fewer than ${metrics.min_sample} assignments were made in the last ${window} days`}
          unmeasuredRemedy="Carry a threat through the loop, or assign training from a policy finding, and completion becomes measurable."
          definition={{
            calculation: t('p.completed-assignments-divided-by-assignments-mad'),
            includes: [t('u.def-every-assignment-in-window')],
            excludes: [t('u.def-assignments-before-window')],
            caveat: t('p.a-high-completion-rate-is-not'),
          }}
        />
      </Panel>

      <Panel>
        <HonestMetric
          label={t('p.quiz-pass-rate')}
          value={null}
          format="percent"
          sample={0}
          sampleNoun={t('u.graded-quizzes')}
          windowDays={window}
          source="live"
          sourceDetail={t('u.platform-api')}
          unmeasuredReason={t('u.no-endpoint-aggregates-quiz-scores-into-a')}
          unmeasuredRemedy="Each completed assignment carries its own score against a pass mark, but the dashboard reports completion only. This figure appears when the platform aggregates those scores."
          definition={{
            calculation: t('p.would-be-graded-quizzes-at-or'),
            excludes: [t('u.def-platform-does-not-compute')],
            caveat: t('p.not-derived-from-the-perassignment-scores'),
          }}
        />
      </Panel>
    </div>
  )
}
