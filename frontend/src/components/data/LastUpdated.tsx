/**
 * When a number was last refreshed: relative in the layout, exact on hover.
 *
 * Every dashboard here polls, so a figure on screen is always some age. Without
 * this, a stalled backend and a healthy one look identical — the last good value
 * simply sits there looking current.
 */

import { Clock } from 'lucide-react'
import { cn, formatDateTime, timeAgo } from '../../lib/format'
import { Tip } from './Tip'

export interface LastUpdatedProps {
  /** ISO timestamp. A naive one is read as UTC — see `format.ts`. */
  at: string | null | undefined
  /** Leading word. "Updated" by default; "Fetched" and "Measured" also read well. */
  prefix?: string
  /** Hides the clock icon where the row is already dense. */
  hideIcon?: boolean
  className?: string
}

export function LastUpdated({ at, prefix = 'Updated', hideIcon = false, className }: LastUpdatedProps) {
  const relative = timeAgo(at)
  const exact = formatDateTime(at)
  const known = relative !== '—'

  const body = (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-fg-faint', className)}>
      {hideIcon ? null : <Clock className="size-3.5 shrink-0" aria-hidden="true" />}
      {known ? `${prefix} ${relative}` : 'Update time not recorded'}
    </span>
  )

  return known ? <Tip content={exact}>{body}</Tip> : body
}
