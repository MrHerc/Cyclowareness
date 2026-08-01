import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import type { Severity } from '../../domain/types'
import { humanise } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_TICK, SEVERITY_COLOR, SEVERITY_ORDER } from './chartTheme'

export interface SeverityCount {
  severity: Severity
  count: number
}

export interface SeverityBarChartProps {
  data: SeverityCount[]
  /** Override when the chart is not counting findings — say what is counted. */
  title?: string
  caption?: string
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

interface Row {
  label: string
  severity: Severity
  count: number
}

/**
 * Findings by severity, horizontally.
 *
 * Horizontal because severity names are words, and words rotated to fit under a
 * vertical axis stop being scannable. Bars are always ordered critical to info
 * regardless of the order they arrive in — a severity chart that reorders itself
 * by magnitude makes two screenshots of the same system look like two systems.
 */
export function SeverityBarChart({
  data,
  title = 'Findings by severity',
  caption,
  height = 220,
  loading = false,
  error = null,
  className,
}: SeverityBarChartProps) {
  const bySeverity = new Map(data.map((entry) => [entry.severity, entry.count]))
  const rows: Row[] = SEVERITY_ORDER.filter((severity) => bySeverity.has(severity)).map(
    (severity) => ({
      label: humanise(severity),
      severity,
      count: bySeverity.get(severity) ?? 0,
    }),
  )

  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <ChartFrame
      title={title}
      caption={caption ?? `${total} in total`}
      height={height}
      hasData={total > 0}
      loading={loading}
      error={error}
      emptyTitle="Nothing to show"
      emptyMessage="No findings have been raised in this view."
      description={`Counts by severity: ${rows.map((row) => `${row.label} ${row.count}`).join(', ')}.`}
      className={className}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={72}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-line-subtle)' }}
          isAnimationActive={false}
          content={(props) => {
            if (!props.active) return null
            const row = rows.find((candidate) => candidate.label === props.label)
            if (!row) return null
            return (
              <ChartTooltip
                title={row.label}
                rows={[
                  {
                    label: 'Findings',
                    color: SEVERITY_COLOR[row.severity],
                    value: String(row.count),
                  },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.severity} fill={SEVERITY_COLOR[row.severity]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  )
}
