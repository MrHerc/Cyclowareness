/**
 * A progress bar that refuses to draw zero for "unknown".
 *
 * `value = null` is the indeterminate state: the track shimmers and the readout
 * is an em dash. Rendering a null as an empty bar would say "nothing has
 * happened", which is a different claim from "we have not measured this" — the
 * distinction this product is built on.
 *
 * `label` is required. A bar with no accessible name is announced as a
 * percentage with no subject.
 */

import * as RadixProgress from '@radix-ui/react-progress'
import { cn } from '../../lib/format'
import { TONE_DOT, type StatusTone } from './status'

export interface ProgressProps {
  /** 0..max, or null when the value is genuinely not known. */
  value: number | null
  max?: number
  /** Required accessible name. Shown when `showLabel`. */
  label: string
  showLabel?: boolean
  /** Renders the numeric readout beside the label. */
  showValue?: boolean
  tone?: StatusTone
  size?: 'sm' | 'md'
  className?: string
}

export function Progress({
  value,
  max = 100,
  label,
  showLabel = false,
  showValue = false,
  tone = 'brand',
  size = 'md',
  className,
}: ProgressProps) {
  const indeterminate = value === null || Number.isNaN(value)
  const clamped = indeterminate ? 0 : Math.min(Math.max(value, 0), max)
  const percent = max > 0 ? (clamped / max) * 100 : 0

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(showLabel || showValue) && (
        <div className="flex items-baseline justify-between gap-3">
          {showLabel && <span className="text-sm text-fg-muted">{label}</span>}
          {showValue && (
            <span className="text-sm text-fg tabular-nums">
              {indeterminate ? '—' : `${Math.round(percent)}%`}
            </span>
          )}
        </div>
      )}

      <RadixProgress.Root
        value={indeterminate ? null : clamped}
        max={max}
        aria-label={label}
        className={cn(
          'relative w-full overflow-hidden rounded-chip bg-raised',
          size === 'sm' ? 'h-1' : 'h-2',
          indeterminate && 'shimmer',
        )}
      >
        {!indeterminate && (
          <RadixProgress.Indicator
            className={cn('h-full rounded-chip transition-[width] duration-300', TONE_DOT[tone])}
            style={{ width: `${percent}%` }}
          />
        )}
      </RadixProgress.Root>
    </div>
  )
}
