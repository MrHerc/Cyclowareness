/**
 * A risk score, rendered so the band is legible without relying on hue.
 *
 * The bar is a 0–100 track, not a bar scaled to the largest value on screen: a
 * score of 62 has to look like 62 in every row of every table, or the column
 * stops being comparable the moment it is filtered.
 */

import { cn, num, riskBand, riskBandLabel } from '../../lib/format'
import { BAND_FILL, BAND_TEXT } from './riskModel'

export interface RiskScoreProps {
  score: number
  /** Adds the 0–100 track under the figure. */
  bar?: boolean
  size?: 'sm' | 'lg'
  className?: string
}

export function RiskScore({ score, bar = false, size = 'sm', className }: RiskScoreProps) {
  const band = riskBand(score)

  return (
    <span className={cn('inline-flex min-w-0 flex-col gap-1', className)}>
      <span className="flex items-baseline gap-2">
        <span className={cn(size === 'lg' ? 'text-display' : 'text-h', 'tabular-nums', BAND_TEXT[band])}>
          {num(score, 0)}
        </span>
        <span className={cn('text-xs', size === 'lg' ? BAND_TEXT[band] : 'text-fg-subtle')}>
          {riskBandLabel(score)}
        </span>
      </span>
      {bar ? (
        <span
          aria-hidden="true"
          className={cn('block h-1 w-full min-w-16 overflow-hidden rounded-chip bg-raised', size === 'lg' && 'h-1.5')}
        >
          <span
            className={cn('block h-full rounded-chip', BAND_FILL[band])}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </span>
      ) : null}
    </span>
  )
}
