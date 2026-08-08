import { useT } from '../../lib/i18n'
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'
import { pct } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { SERIES } from './chartTheme'

const COMPLETED_COLOR = SERIES[1]
const AWAITING_COLOR = SERIES[3]
const FAILED_COLOR = SERIES[0]

export interface LoopOutcomeChartProps {
  /** Loops that reached stage 7 and closed. */
  completed: number
  /** Loops still in flight — awaiting approval, training or measurement. */
  awaiting: number
  /** Loops that stopped on an error. */
  failed: number
  windowDays?: number
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Closed-loop outcomes as one composition bar.
 *
 * A single stacked bar rather than three columns because the question is
 * "what share of what we started actually closed", and a share is what a
 * composition bar answers without arithmetic. Counts are on the legend so the
 * exact figures never require a hover.
 *
 * These are counts, not rates: a zero here is a measured zero and is shown as
 * `0`, unlike the `null` rates elsewhere in this layer.
 */
export function LoopOutcomeChart({
  completed,
  awaiting,
  failed,
  windowDays,
  height = 96,
  loading = false,
  error = null,
  className,
}: LoopOutcomeChartProps) {
  const t = useT()
  const total = completed + awaiting + failed
  const share = (value: number) => (total === 0 ? null : pct(value / total, 0))

  return (
    <ChartFrame
      title={t('u.loop-outcomes-2')}
      caption={windowDays ? `Last ${windowDays} days · ${total} loops` : `${total} loops`}
      legend={[
        { label: 'Completed', color: COMPLETED_COLOR, value: String(completed) },
        { label: 'Awaiting', color: AWAITING_COLOR, value: String(awaiting) },
        { label: 'Failed', color: FAILED_COLOR, value: String(failed) },
      ]}
      height={height}
      hasData={total > 0}
      loading={loading}
      error={error}
      emptyTitle={t('p.no-loops-yet')}
      emptyMessage={t('u.loop-outcome-empty')}
      description={`Of ${total} loops, ${completed} completed, ${awaiting} are still in flight and ${failed} failed.`}
      className={className}
    >
      <BarChart
        data={[{ name: 'Loops', completed, awaiting, failed }]}
        layout="vertical"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          cursor={false}
          isAnimationActive={false}
          content={(props) => {
            if (!props.active) return null
            return (
              <ChartTooltip
                title={t('u.loop-outcomes-2')}
                note={`${total} loops in total`}
                rows={[
                  {
                    label: 'Completed',
                    color: COMPLETED_COLOR,
                    value: `${completed} · ${share(completed) ?? '—'}`,
                  },
                  {
                    label: 'Awaiting',
                    color: AWAITING_COLOR,
                    value: `${awaiting} · ${share(awaiting) ?? '—'}`,
                  },
                  {
                    label: 'Failed',
                    color: FAILED_COLOR,
                    value: `${failed} · ${share(failed) ?? '—'}`,
                  },
                ]}
              />
            )
          }}
        />
        <Bar
          dataKey="completed"
          stackId="outcome"
          fill={COMPLETED_COLOR}
          barSize={28}
          isAnimationActive={false}
        />
        <Bar
          dataKey="awaiting"
          stackId="outcome"
          fill={AWAITING_COLOR}
          barSize={28}
          isAnimationActive={false}
        />
        <Bar
          dataKey="failed"
          stackId="outcome"
          fill={FAILED_COLOR}
          barSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  )
}
