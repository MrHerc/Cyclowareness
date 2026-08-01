import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../../domain/types'
import { num, riskBandLabel } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import {
  ACTIVE_DOT_RADIUS,
  AXIS_LINE,
  AXIS_TICK,
  BAND_COLOR,
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

const RISK_COLOR = SERIES[2]

/** The thresholds `riskBand()` uses. Drawn so a reader can place the line. */
const ELEVATED_AT = 40
const HIGH_AT = 60

export interface RiskTrendChartProps {
  points: TrendPoint[]
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Organisation-wide average risk score over time.
 *
 * The line is a neutral series hue, not a risk hue: the score's own colour
 * changes as it crosses a band, and a line that recoloured itself mid-flight
 * would read as two different measurements. The band thresholds are drawn as
 * reference lines instead, which is what actually lets someone say "we are
 * still in elevated" without reading the axis.
 */
export function RiskTrendChart({
  points,
  windowDays,
  height = 240,
  loading = false,
  error = null,
  className,
}: RiskTrendChartProps) {
  const scores = points.map((p) => p.avg_risk_score)
  const hasData = hasEnoughPoints(scores)

  return (
    <ChartFrame
      title="Average risk over time"
      caption={
        windowDays
          ? `Last ${windowDays} days · 0–100, lower is better`
          : '0–100, lower is better'
      }
      legend={[
        { label: 'Average risk', color: RISK_COLOR },
        { label: `Elevated at ${ELEVATED_AT}`, color: BAND_COLOR.elevated },
        { label: `High at ${HIGH_AT}`, color: BAND_COLOR.high },
      ]}
      height={height}
      hasData={hasData}
      loading={loading}
      error={error}
      emptyMessage="Risk has been scored on fewer than two days in this window."
      description="Organisation-wide average risk score per day, on a 0 to 100 scale, with the elevated and high band thresholds marked."
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
          domain={[0, 100]}
          width={32}
        />
        <ReferenceLine
          y={ELEVATED_AT}
          stroke={BAND_COLOR.elevated}
          strokeOpacity={0.35}
          strokeDasharray="4 4"
        />
        <ReferenceLine
          y={HIGH_AT}
          stroke={BAND_COLOR.high}
          strokeOpacity={0.35}
          strokeDasharray="4 4"
        />
        <Tooltip
          cursor={CURSOR}
          isAnimationActive={false}
          content={(props) => {
            if (!props.active) return null
            const point = points.find((p) => p.date === props.label)
            if (!point) return null
            const score = point.avg_risk_score
            return (
              <ChartTooltip
                title={formatDayFull(point.date)}
                note={score === null ? undefined : riskBandLabel(score)}
                rows={[
                  {
                    label: 'Average risk',
                    color: RISK_COLOR,
                    value: score === null ? null : num(score, 1),
                  },
                ]}
              />
            )
          }}
        />
        <Line
          type="monotone"
          dataKey="avg_risk_score"
          name="Average risk"
          stroke={RISK_COLOR}
          strokeWidth={2}
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: RISK_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  )
}
