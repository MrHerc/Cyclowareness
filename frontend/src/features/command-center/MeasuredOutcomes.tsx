/**
 * The four numbers the loop is supposed to move.
 *
 * Every one of them is a rate or a score, so every one of them goes through
 * `HonestMetric` and carries its own denominator. Three notes on what is
 * deliberately absent:
 *
 *   - **No comparison arrows.** The dashboard sends a trend series but not a
 *     comparable previous-period aggregate, and computing one from the tail of
 *     the series would produce an arrow whose baseline nobody could state. An
 *     absent arrow is honest; an unsourced one is not.
 *
 *   - **No tone on the behaviour rates.** There is no defensible threshold at
 *     which a click rate becomes "critical", so colouring it would be an
 *     invented judgement. The average risk score does have one — `riskBand()` in
 *     `lib/format` is the product's own banding — so that is the only figure
 *     here that takes a risk hue.
 *
 *   - **No window on the risk score.** It is the current standing of the
 *     population, not a measurement over a trailing period.
 */

import { HonestMetric, type MetricTone } from '../../components/data'
import { AsyncBoundary, SkeletonCard } from '../../components/states'
import { Panel } from '../../components/ui'
import type { DepartmentRisk, Metrics } from '../../domain/types'
import { riskBand } from '../../lib/format'

export interface MeasuredOutcomesProps {
  metrics: Metrics | undefined
  departments: DepartmentRisk[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

const BAND_TONE: Record<'low' | 'elevated' | 'high', MetricTone> = {
  low: 'safe',
  elevated: 'medium',
  high: 'critical',
}

/** Why a rate is missing, said with the numbers the server actually reported. */
function unmeasured(sample: number, minSample: number, windowDays: number, noun: string): string {
  return sample === 0
    ? `No ${noun} resolved in the last ${windowDays} days`
    : `${sample} ${noun} resolved — the model needs ${minSample} before it will state a rate`
}

export function MeasuredOutcomes({
  metrics,
  departments,
  isLoading,
  error,
  onRetry,
}: MeasuredOutcomesProps) {
  const scored = departments.reduce((total, department) => total + department.employee_count, 0)
  const riskTone: MetricTone =
    metrics?.avg_risk_score !== null && metrics?.avg_risk_score !== undefined
      ? BAND_TONE[riskBand(metrics.avg_risk_score)]
      : 'neutral'

  return (
    <Panel
      title="Measured behaviour"
      headingLevel={4}
      subtitle={
        metrics
          ? `Trailing ${metrics.window_days} days · a rate is withheld below ${metrics.min_sample} resolved events`
          : 'Outcomes the loop is meant to move'
      }
    >
      <AsyncBoundary
        isLoading={isLoading || !metrics}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading measured behaviour"
        skeleton={
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((card) => (
              <SkeletonCard key={card} metric lines={1} />
            ))}
          </div>
        }
      >
        {metrics ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <HonestMetric
              label="Phishing click rate"
              value={metrics.phishing_click_rate}
              format="percent"
              sample={metrics.simulation_sample}
              sampleNoun="delivered simulations"
              windowDays={metrics.window_days}
              source="live"
              unmeasuredReason={unmeasured(
                metrics.simulation_sample,
                metrics.min_sample,
                metrics.window_days,
                'simulation outcomes',
              )}
              unmeasuredRemedy="Launch a campaign and record its outcomes to start measuring."
            />

            <HonestMetric
              label="Report rate"
              value={metrics.report_rate}
              format="percent"
              sample={metrics.simulation_sample}
              sampleNoun="delivered simulations"
              windowDays={metrics.window_days}
              source="live"
              unmeasuredReason={unmeasured(
                metrics.simulation_sample,
                metrics.min_sample,
                metrics.window_days,
                'simulation outcomes',
              )}
              unmeasuredRemedy="Reporting is only measurable once a campaign has been delivered."
            />

            <HonestMetric
              label="Training completion rate"
              value={metrics.training_completion_rate}
              format="percent"
              sample={metrics.training_sample}
              sampleNoun="assigned modules"
              windowDays={metrics.window_days}
              source="live"
              unmeasuredReason={unmeasured(
                metrics.training_sample,
                metrics.min_sample,
                metrics.window_days,
                'training assignments',
              )}
              unmeasuredRemedy="Approve content at the gate to put assignments in front of people."
            />

            <HonestMetric
              label="Average risk score"
              value={metrics.avg_risk_score}
              format="score"
              sample={scored}
              sampleNoun="scored employees"
              source="live"
              tone={riskTone}
              hint="Current standing of the scored population, on a 0–100 scale."
              unmeasuredReason="No employee has a scored risk profile yet"
              unmeasuredRemedy="The risk engine scores a person once they have at least one recorded event."
            />
          </div>
        ) : null}
      </AsyncBoundary>
    </Panel>
  )
}
