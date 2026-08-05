import { Bar, BarChart, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { signed } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, DIVERGING, ZERO_LINE } from './chartTheme'

/** Below this the movement is noise, and is drawn as neutral rather than coloured. */
const NEUTRAL_BELOW = 0.5

export interface RiskMovement {
  department: string
  /**
   * Change in average risk score. Positive means risk ROSE — the bad
   * direction. Everything about this chart depends on that sign.
   */
  delta: number
}

export interface RiskMovementChartProps {
  data: RiskMovement[]
  /** Forwarded to `ChartFrame`. A chart sitting beside another must be able to
   *  match its level, or one reads as a child of the other. */
  headingLevel?: 2 | 3 | 4
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Per-department risk movement, diverging around zero.
 *
 * Two hues and a neutral midpoint, never a rainbow: red is risk rising, green
 * is risk falling, and a movement too small to matter fades to a content tone
 * so it stops competing for attention. The domain is forced symmetric so a bar
 * of a given length means the same amount of change on either side of zero — an
 * auto domain would silently make a small improvement look like a large one.
 */
export function RiskMovementChart({
  headingLevel,
  data,
  windowDays,
  height = 260,
  loading = false,
  error = null,
  className,
}: RiskMovementChartProps) {
  // Largest rise at the top: the departments that got worse are the ones an
  // analyst has to do something about.
  const rows = [...data].sort((a, b) => b.delta - a.delta)
  const extent = rows.reduce((max, row) => Math.max(max, Math.abs(row.delta)), 0)
  const bound = extent === 0 ? 1 : Math.ceil(extent)

  const colorFor = (delta: number) => {
    if (Math.abs(delta) < NEUTRAL_BELOW) return DIVERGING.neutral
    return delta > 0 ? DIVERGING.worse : DIVERGING.better
  }
  // Magnitude as opacity gives a real diverging scale rather than two flat
  // blocks, while the midpoint stays visibly nearer the background.
  const opacityFor = (delta: number) => 0.35 + 0.6 * Math.min(1, Math.abs(delta) / bound)

  return (
    <ChartFrame
      headingLevel={headingLevel}
      title="Risk movement by department"
      caption={
        windowDays
          ? `Change in average risk over the last ${windowDays} days · negative is improvement`
          : 'Change in average risk · negative is improvement'
      }
      legend={[
        { label: 'Risk rose', color: DIVERGING.worse },
        { label: 'Risk fell', color: DIVERGING.better },
        { label: 'No material change', color: DIVERGING.neutral },
      ]}
      height={height}
      hasData={rows.length > 0}
      loading={loading}
      error={error}
      emptyTitle="No movement to show"
      emptyMessage="No department has two scored points to compare in this window."
      description={`Change in average risk score per department: ${rows
        .map((row) => `${row.department} ${signed(row.delta, 1)}`)
        .join(', ')}.`}
      className={className}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <XAxis
          type="number"
          domain={[-bound, bound]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => signed(value, 0)}
        />
        <YAxis
          type="category"
          dataKey="department"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={112}
        />
        <ReferenceLine x={0} stroke={ZERO_LINE} />
        <Tooltip
          cursor={{ fill: 'var(--color-line-subtle)' }}
          isAnimationActive={false}
          content={(props) => {
            if (!props.active) return null
            const row = rows.find((candidate) => candidate.department === props.label)
            if (!row) return null
            return (
              <ChartTooltip
                title={row.department}
                note={
                  Math.abs(row.delta) < NEUTRAL_BELOW
                    ? 'No material change'
                    : row.delta > 0
                      ? 'Risk rose'
                      : 'Risk fell'
                }
                rows={[
                  {
                    label: 'Change in average risk',
                    color: colorFor(row.delta),
                    value: signed(row.delta, 1),
                  },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="delta" barSize={14} radius={2} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell
              key={row.department}
              fill={colorFor(row.delta)}
              fillOpacity={opacityFor(row.delta)}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  )
}
