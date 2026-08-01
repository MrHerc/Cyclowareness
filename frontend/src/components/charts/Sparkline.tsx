import { cn } from '../../lib/format'
import { SERIES, hasEnoughPoints } from './chartTheme'

export interface SparklineProps {
  /** In chronological order. `null` is an unmeasured period, not a zero. */
  values: ReadonlyArray<number | null | undefined>
  width?: number
  height?: number
  /** A `var(--color-*)` reference from `chartTheme`. */
  color?: string
  /**
   * What the line is of, for screen readers — "Risk over the last 8 weeks".
   * A bare sparkline in a table row is otherwise silent to assistive tech.
   */
  label?: string
  className?: string
}

interface Point {
  x: number
  y: number
}

/**
 * A trend small enough to live inside a table row: no axes, no ticks, no
 * tooltip.
 *
 * Hand-drawn SVG rather than a Recharts instance, for two reasons. A table can
 * hold two hundred of these and two hundred chart runtimes is a scroll
 * jankfest; and the gap behaviour has to be exact — an unmeasured period breaks
 * the line, and a measured point stranded between two gaps is drawn as a dot so
 * that it does not disappear entirely.
 */
export function Sparkline({
  values,
  width = 76,
  height = 22,
  color = SERIES[2],
  label,
  className,
}: SparklineProps) {
  if (!hasEnoughPoints(values)) {
    return (
      <span className={cn('inline-flex items-center text-xs text-fg-faint', className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{label ? `${label}: not enough data` : 'Not enough data'}</span>
      </span>
    )
  }

  const measured = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  const min = Math.min(...measured)
  const max = Math.max(...measured)
  // A flat series would divide by zero; centre it instead of spiking it.
  const span = max - min || 1
  // Inset by the stroke radius on all sides so the first and last points are not
  // sliced in half by the viewBox edge.
  const padding = 2
  const plotHeight = height - padding * 2
  const plotWidth = width - padding * 2
  const step = values.length > 1 ? plotWidth / (values.length - 1) : 0

  // Split into runs of consecutive measured points. Each run is drawn on its
  // own, which is what leaves a visible hole where nothing was measured.
  const segments: Point[][] = []
  let current: Point[] = []
  values.forEach((value, index) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      current.push({
        x: padding + index * step,
        y: padding + plotHeight - ((value - min) / span) * plotHeight,
      })
      return
    }
    if (current.length > 0) segments.push(current)
    current = []
  })
  if (current.length > 0) segments.push(current)

  return (
    <span className={cn('inline-block align-middle', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label ?? 'Trend'}
        focusable="false"
      >
        {segments.map((segment, index) =>
          segment.length === 1 ? (
            <circle key={index} cx={segment[0]?.x} cy={segment[0]?.y} r={1.6} fill={color} />
          ) : (
            <polyline
              key={index}
              points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
      </svg>
    </span>
  )
}
