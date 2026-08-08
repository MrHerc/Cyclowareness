/**
 * "n=41 delivered simulations" — the size of the thing a rate was divided by.
 *
 * A rate without its denominator is unfalsifiable. One click out of two is 50%
 * and so is fifty out of a hundred; only one of them is worth acting on. This
 * label is never optional on a rate, and never lives in a tooltip.
 */

import { cn } from '../../lib/format'
import { useT } from '../../lib/i18n'

export interface SampleSizeLabelProps {
  sample: number
  /**
   * Plural noun for what was counted: "delivered simulations", "completed
   * assignments". Passed in rather than derived — only the caller knows what
   * its denominator actually is, and a wrong noun is a wrong claim.
   */
  noun: string
  /** Trailing window the sample was drawn from. Omit when a date range is shown instead. */
  windowDays?: number
  className?: string
}

export function SampleSizeLabel({ sample, noun, windowDays, className }: SampleSizeLabelProps) {
  const t = useT()
  const classes = cn('text-xs text-fg-faint', className)

  // A non-finite count means the caller does not know its own denominator.
  // Printing "n=NaN" is noise; claiming n=0 would be a fabricated fact.
  if (!Number.isFinite(sample)) {
    return <span className={classes}>{t('u.sample-size-not-recorded-2')}</span>
  }

  return (
    <span className={classes}>
      n={Math.trunc(sample)} {noun}
      {windowDays !== undefined ? ` · last ${windowDays} days` : ''}
    </span>
  )
}
