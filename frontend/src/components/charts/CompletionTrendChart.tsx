import { useT } from '../../lib/i18n'
import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
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

const COMPLETION_COLOR = SERIES[1]

export interface CompletionTrendChartProps {
  points: TrendPoint[]
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Training completion rate over time.
 *
 * Completion is the weakest of the three headline measures — it counts
 * attendance, not behaviour — so the caption says so out loud. Filled as an
 * area rather than a line to read as volume rather than as evidence, which is
 * the distinction the behaviour chart next to it depends on.
 */
export function CompletionTrendChart({
  points,
  windowDays,
  height = 220,
  loading = false,
  error = null,
  className,
}: CompletionTrendChartProps) {
  const t = useT()
  // The gradient id must be unique per instance or two charts on one page share
  // a fill and the second silently inherits the first. `useId` wraps its value
  // in punctuation that is not safe inside `url(#…)`, so it is stripped.
  const gradientId = `completion-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const rates = points.map((p) => p.training_completion_rate)
  const hasData = hasEnoughPoints(rates)

  return (
    <ChartFrame
      title="Training completion"
      caption={
        windowDays
          ? `Last ${windowDays} days · completion is attendance, not behaviour change`
          : t('p.completion-is-attendance-not-behaviour-change')
      }
      legend={[{ label: 'Completion rate', color: COMPLETION_COLOR }]}
      height={height}
      hasData={hasData}
      loading={loading}
      error={error}
      emptyMessage="Fewer than two days in this window had assignments due."
      description="Share of assigned training completed, per day. Days with no assignments due are omitted rather than counted as zero."
      className={className}
    >
      <AreaChart data={points} margin={PLOT_MARGIN} accessibilityLayer>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COMPLETION_COLOR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={COMPLETION_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          domain={[0, 1]}
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
                    label: 'Completion rate',
                    color: COMPLETION_COLOR,
                    value:
                      point.training_completion_rate === null
                        ? null
                        : pct(point.training_completion_rate, 1),
                  },
                ]}
              />
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="training_completion_rate"
          name="Completion rate"
          stroke={COMPLETION_COLOR}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          connectNulls={false}
          dot={{ r: DOT_RADIUS, fill: COMPLETION_COLOR, strokeWidth: 0 }}
          activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartFrame>
  )
}
