import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useT } from '../../lib/i18n'
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
const BEHAVIOUR_COLOR = SERIES[0]

/** The thresholds `riskBand()` uses. Drawn so a reader can place the line. */
const ELEVATED_AT = 40
const HIGH_AT = 60

export interface RiskTrendChartProps {
  /** Forwarded to ChartFrame. Pass 2 when the chart sits directly under
   *  the page h1, or the outline skips a level. */
  headingLevel?: 2 | 3 | 4
  points: TrendPoint[]
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Organisation-wide risk over time — as TWO lines, deliberately.
 *
 * The composite score falls when training is merely completed: finishing an
 * assigned module subtracts ten points. So a chart of the composite, captioned
 * as proof the programme works, is proving only that modules were assigned.
 * Behaviour risk moves on what people did when a threat reached them, and is
 * the only one of the two an efficacy claim may rest on.
 *
 * Both are drawn because the gap between them is itself the finding: composite
 * falling while behaviour is flat means engagement went up and exposure did not.
 * A single line cannot say that, and the single line it used to be said the
 * opposite.
 *
 * Neutral series hues, not risk hues: the score's own colour changes as it
 * crosses a band, and a line that recoloured itself mid-flight would read as two
 * different measurements. The thresholds are reference lines instead.
 */
export function RiskTrendChart({
  headingLevel,
  points,
  windowDays,
  height = 240,
  loading = false,
  error = null,
  className,
}: RiskTrendChartProps) {
  const t = useT()
  // Gated on the BEHAVIOUR series: the chart's claim is about behaviour, so
  // a window with a composite but no behaviour measurement has nothing to say.
  const hasData = hasEnoughPoints(points.map((p) => p.avg_behaviour_risk))

  // The caveat belongs to the SERIES, not to one page that remembers to print
  // it. Executive read `source` and disclosed the seeded points; Departments
  // drew the identical series and said nothing, so the same data was measurement
  // on one screen and demonstration on another. Counting it here means every
  // consumer inherits the disclosure, including the next one.
  const seeded = points.filter((point) => point.source === 'seeded').length

  return (
    <ChartFrame
      headingLevel={headingLevel}
      title={t('u.risk-over-time-2')}
      caption={
        (windowDays
          ? `Last ${windowDays} days · 0–100, lower is better. Only the behaviour line measures whether people are safer; the composite also falls when training is completed.`
          : '0–100, lower is better. Only the behaviour line measures whether people are safer; the composite also falls when training is completed.') +
        (seeded > 0
          ? ` ${seeded} of ${points.length} points here were written by the demonstration seed rather than measured from this deployment's own events.`
          : '')
      }
      legend={[
        { label: 'Behaviour risk', color: BEHAVIOUR_COLOR },
        { label: 'Composite score', color: RISK_COLOR },
        { label: `Elevated at ${ELEVATED_AT}`, color: BAND_COLOR.elevated },
        { label: `High at ${HIGH_AT}`, color: BAND_COLOR.high },
      ]}
      height={height}
      hasData={hasData}
      loading={loading}
      error={error}
      emptyMessage={t('u.risk-trend-empty')}
      description="Two lines per day on a 0 to 100 scale: behaviour risk, which moves only on what people did when a threat reached them, and the composite score, which also includes training engagement. Elevated and high band thresholds are marked."
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
            const behaviour = point.avg_behaviour_risk
            return (
              <ChartTooltip
                title={formatDayFull(point.date)}
                note={behaviour === null ? undefined : riskBandLabel(behaviour)}
                rows={[
                  {
                    label: 'Behaviour risk',
                    color: BEHAVIOUR_COLOR,
                    value: behaviour === null ? null : num(behaviour, 1),
                  },
                  {
                    label: 'Composite score',
                    color: RISK_COLOR,
                    value: score === null ? null : num(score, 1),
                  },
                ]}
              />
            )
          }}
        />
        {/* The composite is drawn thinner and dashed: it is context, not the
            claim. The solid line is the one a reader may quote. */}
        <Line
          type="monotone"
          dataKey="avg_risk_score"
          name="Composite score"
          stroke={RISK_COLOR}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: RISK_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="avg_behaviour_risk"
          name="Behaviour risk"
          stroke={BEHAVIOUR_COLOR}
          strokeWidth={2}
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: BEHAVIOUR_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  )
}
