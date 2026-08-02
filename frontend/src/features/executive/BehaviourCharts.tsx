/**
 * The three trend charts, over a window the reader chooses.
 *
 * `/api/dashboard/executive` takes no range parameter — it always answers with
 * the last 180 daily snapshots — so the range control here clips a series that
 * was already fetched rather than pretending to re-query the server. That is a
 * real change to what is drawn, and the line under the charts states exactly how
 * many days inside the chosen range actually carried a measurement, because a
 * 90-day window containing four readings is not a 90-day trend.
 *
 * The headline metrics above these charts cannot be re-scoped: the server fixes
 * their trailing window. The caption says so rather than letting one control
 * appear to govern the whole page.
 */

import {
  BehaviourTrendChart,
  CompletionTrendChart,
  RiskTrendChart,
} from '../../components/charts'
import { formatRangeLabel } from '../../components/data'
import type { TrendPoint } from '../../domain/types'
import { measuredDays } from './derive'

export interface BehaviourChartsProps {
  /** Already clipped to the chosen range by the page. */
  points: TrendPoint[]
  range: { from: string; to: string }
  /** The server's fixed trailing window for the metric tiles, in days. */
  metricWindowDays: number
  loading?: boolean
  error?: string | null
}

export function BehaviourCharts({
  points,
  range,
  metricWindowDays,
  loading = false,
  error = null,
}: BehaviourChartsProps) {
  const behaviour = Math.max(
    measuredDays(points, 'phishing_click_rate'),
    measuredDays(points, 'report_rate'),
  )
  const risk = measuredDays(points, 'avg_risk_score')
  const completion = measuredDays(points, 'training_completion_rate')
  // How many of these points the loop actually measured, versus how many the
  // demo seed drew. Both are floats on the wire, so without saying it the
  // chart reads as measurement — which is how a hand-written curve came to
  // sit under "measured from this deployment's own records", telling the
  // opposite story to the live tile directly above it.
  const seeded = points.filter((point) => point.source === 'seeded').length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <BehaviourTrendChart
          points={points}
          height={280}
          loading={loading}
          error={error}
          className="xl:col-span-2"
        />
        <RiskTrendChart points={points} height={240} loading={loading} error={error} />
        <CompletionTrendChart points={points} height={240} loading={loading} error={error} />
      </div>

      <p className="text-xs text-fg-subtle">
        Charts cover {formatRangeLabel(range.from, range.to)} — {behaviour} day
        {behaviour === 1 ? '' : 's'} carried a click or report measurement, {risk} carried a risk
        score, {completion} carried a completion rate. Days with no resolved events are drawn as
        gaps, never joined. The figures above this section are fixed to the server&rsquo;s trailing{' '}
        {metricWindowDays}-day window and are not affected by this control.
      </p>

      {seeded > 0 ? (
        <p className="text-xs text-fg-faint">
          {seeded} of {points.length} points in this range were written by the
          demonstration seed rather than measured from this deployment&rsquo;s own
          events. They are drawn so the chart has a shape to show, and they may
          disagree with the figures above, which are computed from real rows only.
        </p>
      ) : null}
    </div>
  )
}
