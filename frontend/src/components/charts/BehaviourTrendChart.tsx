import { useT } from '../../lib/i18n'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../../domain/types'
import { pct } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import {
  ACTIVE_DOT_RADIUS,
  AXIS_LINE,
  AXIS_TICK,
  CURSOR,
  DOT_RADIUS,
  GRID_DASH,
  GRID_STROKE,
  PLOT_MARGIN,
  SERIES,
  formatDayFull,
  formatDayShort,
  hasEnoughPoints,
} from './chartTheme'

const CLICK_COLOR = SERIES[0]
const REPORT_COLOR = SERIES[1]

export interface BehaviourTrendChartProps {
  points: TrendPoint[]
  /** Trailing window in days, printed in the caption so the rate is readable. */
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Click rate against report rate over time — the product's headline evidence
 * that training changed behaviour rather than attendance.
 *
 * The two lines are deliberately opposed: clicks falling while reports rise is
 * the shape a buyer is looking for, and putting them on one axis is what makes
 * the crossover legible. Days nobody measured are left as gaps, because a line
 * drawn across a quiet fortnight is the most flattering lie a security metric
 * can tell.
 */
export function BehaviourTrendChart({
  points,
  windowDays,
  height = 260,
  loading = false,
  error = null,
  className,
}: BehaviourTrendChartProps) {
  const t = useT()
  const clicks = points.map((p) => p.phishing_click_rate)
  const reports = points.map((p) => p.report_rate)
  // Either line on its own is worth drawing; both empty is not a trend.
  const hasData = hasEnoughPoints(clicks) || hasEnoughPoints(reports)

  const caption = windowDays
    ? `Last ${windowDays} days · gaps are days with no resolved events`
    : t('p.gaps-are-days-with-no-resolved')

  return (
    <ChartFrame
      title="Behaviour over time"
      caption={caption}
      legend={[
        { label: 'Click rate', color: CLICK_COLOR, muted: !hasEnoughPoints(clicks) },
        { label: 'Report rate', color: REPORT_COLOR, muted: !hasEnoughPoints(reports) },
      ]}
      height={height}
      hasData={hasData}
      loading={loading}
      error={error}
      emptyMessage="Simulation outcomes are needed on at least two days before a behaviour trend can be drawn."
      description="Phishing click rate and threat report rate per day. Days without resolved simulation outcomes are omitted rather than interpolated."
      className={className}
    >
      <LineChart data={points} margin={PLOT_MARGIN} accessibilityLayer>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray={GRID_DASH} vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickFormatter={formatDayShort}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          domain={[0, 'auto']}
          tickFormatter={(value: number) => pct(value, 0)}
          width={44}
        />
        <Tooltip
          cursor={CURSOR}
          isAnimationActive={false}
          content={(props) => {
            if (!props.active) return null
            const point = points.find((p) => p.date === props.label)
            if (!point) return null
            return (
              <ChartTooltip
                title={formatDayFull(point.date)}
                rows={[
                  {
                    label: 'Click rate',
                    color: CLICK_COLOR,
                    value:
                      point.phishing_click_rate === null
                        ? null
                        : pct(point.phishing_click_rate, 1),
                  },
                  {
                    label: 'Report rate',
                    color: REPORT_COLOR,
                    value: point.report_rate === null ? null : pct(point.report_rate, 1),
                  },
                ]}
              />
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="phishing_click_rate"
          name="Click rate"
          stroke={CLICK_COLOR}
          strokeWidth={2}
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: CLICK_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="report_rate"
          name="Report rate"
          stroke={REPORT_COLOR}
          strokeWidth={2}
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: REPORT_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  )
}
