/**
 * Skeletons.
 *
 * The rule that makes these worth having: **a skeleton must have the shape and
 * the size of the thing it replaces**. A generic grey box swapped for a
 * three-line card makes the page jump when data lands, which reads as
 * instability on a projector even when the request was fast. So each skeleton
 * here carries the same padding, radius and row height as the real component,
 * and the widths are fixed constants rather than `Math.random()` — a re-render
 * must not reshuffle the bones.
 *
 * These are decoration: every element is `aria-hidden`. The one spoken
 * "loading" announcement belongs to whatever wraps them (see `AsyncBoundary`),
 * so a page of six skeletons does not read out six times.
 */

import type { CSSProperties } from 'react'
import { cn } from '../../lib/format'

export interface SkeletonProps {
  className?: string
  /** Layout only — widths, heights, grid tracks. Never a colour. */
  style?: CSSProperties
}

/**
 * One bone. Everything else in this file is an arrangement of these.
 *
 * `.shimmer` carries the sweep and collapses under prefers-reduced-motion, at
 * which point the bone is still a visible block — the layout keeps working
 * without the animation.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div aria-hidden="true" style={style} className={cn('shimmer rounded-chip bg-elevated', className)} />
  )
}

/* Fixed, deliberately uneven widths. Real prose is ragged; a stack of
   identical bars reads as a table rather than as text. */
const TEXT_WIDTHS = ['100%', '92%', '96%', '84%', '90%']

export interface SkeletonTextProps extends SkeletonProps {
  /** How many lines of body text this stands in for. */
  lines?: number
}

/** A paragraph. The last line is short, the way a real last line is. */
export function SkeletonText({ lines = 3, className, style }: SkeletonTextProps) {
  const count = Math.max(1, lines)
  return (
    <div className={cn('space-y-2', className)} style={style}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className="h-3"
          style={{ width: index === count - 1 ? '58%' : TEXT_WIDTHS[index % TEXT_WIDTHS.length] }}
        />
      ))}
    </div>
  )
}

export interface SkeletonRowProps extends SkeletonProps {
  /** Leaves room for the avatar or status dot the real row starts with. */
  leading?: boolean
  /** Leaves room for the right-aligned value, chip or timestamp. */
  trailing?: boolean
}

/**
 * One row of a list, at the height of a real list row — so a five-row list
 * occupies exactly the space its data will.
 */
export function SkeletonRow({ leading = true, trailing = true, className, style }: SkeletonRowProps) {
  return (
    <div className={cn('flex h-14 items-center gap-3 px-4', className)} style={style}>
      {leading ? <Skeleton className="size-8 shrink-0 rounded-full" /> : null}
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-[38%]" />
        <Skeleton className="h-2.5 w-[62%]" />
      </div>
      {trailing ? <Skeleton className="h-5 w-16 shrink-0" /> : null}
    </div>
  )
}

export interface SkeletonCardProps extends SkeletonProps {
  /** Include the large bone a stat card leads with. */
  metric?: boolean
  /** Body lines under the heading. */
  lines?: number
}

/**
 * A panel: the same border, radius, padding and resting shadow as a real one,
 * so the frame does not appear to redraw when content arrives inside it.
 */
export function SkeletonCard({ metric = false, lines = 2, className, style }: SkeletonCardProps) {
  return (
    <div
      className={cn('rounded-panel border border-line bg-surface p-5 shadow-panel', className)}
      style={style}
    >
      <Skeleton className="h-2.5 w-24" />
      {metric ? <Skeleton className="mt-4 h-8 w-28" /> : null}
      <SkeletonText lines={lines} className={metric ? 'mt-3' : 'mt-4'} />
    </div>
  )
}

export interface SkeletonTableProps extends SkeletonProps {
  rows?: number
  cols?: number
  /** Set false when the caller already renders the real header. */
  header?: boolean
}

/**
 * A table body. The first column is wider because in this product the first
 * column is always the name of the thing; matching that stops the columns
 * shifting sideways on load.
 */
export function SkeletonTable({
  rows = 6,
  cols = 4,
  header = true,
  className,
  style,
}: SkeletonTableProps) {
  const columns = Math.max(1, cols)
  const gridTemplateColumns = `minmax(0, 2fr) repeat(${columns - 1}, minmax(0, 1fr))`

  return (
    <div
      className={cn('overflow-hidden rounded-panel border border-line bg-surface', className)}
      style={style}
    >
      {header ? (
        <div
          className="grid items-center gap-4 border-b border-line-subtle px-4 py-3"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className="h-2.5 w-16" />
          ))}
        </div>
      ) : null}
      <div className="divide-line">
        {Array.from({ length: Math.max(1, rows) }, (_, row) => (
          <div key={row} className="grid items-center gap-4 px-4 py-4" style={{ gridTemplateColumns }}>
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton key={col} className={cn('h-3', col === 0 ? 'w-[70%]' : 'w-[52%]')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* A fixed silhouette: uneven enough to read as data, flat enough that nobody
   mistakes it for a measurement. These bars are not a chart of anything. */
const CHART_BARS = [42, 66, 38, 74, 55, 88, 61, 47, 70, 34, 58, 79]

export interface SkeletonChartProps extends SkeletonProps {
  /** Plot height in pixels — pass the height the real chart is given. */
  height?: number
  /** Leaves room for the y-axis tick labels the real chart draws. */
  axis?: boolean
}

/**
 * A chart plot. Reserves the exact plot height, so whatever sits below a chart
 * does not slide down when the series arrives.
 */
export function SkeletonChart({ height = 200, axis = true, className, style }: SkeletonChartProps) {
  return (
    <div className={cn('flex gap-3', className)} style={style}>
      {axis ? (
        <div className="flex shrink-0 flex-col justify-between py-1" style={{ height }}>
          {Array.from({ length: 4 }, (_, tick) => (
            <Skeleton key={tick} className="h-2 w-7" />
          ))}
        </div>
      ) : null}
      <div
        className="flex min-w-0 flex-1 items-end gap-2 border-b border-line-subtle"
        style={{ height }}
      >
        {CHART_BARS.map((barHeight, index) => (
          <Skeleton
            key={index}
            className="min-w-1 flex-1 rounded-b-none"
            style={{ height: `${barHeight}%` }}
          />
        ))}
      </div>
    </div>
  )
}
