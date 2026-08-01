/**
 * "Not measured", inline — for a table cell or a stat row.
 *
 * This is the small sibling of `InsufficientDataState`. It exists so a cell with
 * no measurement never falls back to `0`, `0%`, `—` or a blank: all four read as
 * a value, and three of them read as a *good* value. The words are the point.
 */

import { Minus } from 'lucide-react'
import { cn } from '../../lib/format'
import { Tip } from './Tip'

export interface NoMeasurementProps {
  /** Why there is no number. Shown on hover and focus; keep it to a clause. */
  reason?: string
  /** Override only when "Not measured" is wrong — e.g. "Not applicable". */
  label?: string
  className?: string
}

export function NoMeasurement({ reason, label = 'Not measured', className }: NoMeasurementProps) {
  const body = (
    <span className={cn('inline-flex items-center gap-1.5 text-fg-faint', className)}>
      <Minus className="size-3.5 shrink-0" aria-hidden="true" />
      <span className={reason ? 'underline decoration-dotted underline-offset-4' : undefined}>{label}</span>
    </span>
  )

  return reason ? <Tip content={reason}>{body}</Tip> : body
}
