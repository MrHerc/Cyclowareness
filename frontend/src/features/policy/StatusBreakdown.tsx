/**
 * Findings by status, as proportions of one measured total.
 *
 * Deliberately not a pie or a donut: the reader's question is "how much of this
 * is still open", which is a comparison of lengths against a common baseline,
 * and a stack of bars answers it without asking anyone to judge angles.
 *
 * Every status the API knows is drawn, including the ones sitting at zero. A
 * status that disappears when its count is zero makes an empty queue look like
 * a queue that does not exist.
 */

import { Link } from 'react-router-dom'
import { TONE_DOT, statusTone } from '../../components/ui'
import { cn, pct } from '../../lib/format'
import { FINDING_STATUS_LABELS, FINDING_STATUS_ORDER } from './vocabulary'

export interface StatusBreakdownProps {
  counts: Record<string, number>
  /** The denominator. Always the window's sample, never the sum of drawn rows. */
  total: number
  className?: string
}

export function StatusBreakdown({ counts, total, className }: StatusBreakdownProps) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {FINDING_STATUS_ORDER.map((status) => {
        const count = counts[status] ?? 0
        const share = total > 0 ? count / total : 0
        const tone = statusTone(status)

        return (
          <li key={status}>
            <Link
              to={`/policy-intelligence/findings?status=${status}`}
              className="group block rounded-control px-1 py-0.5 transition-colors hover:bg-raised"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-fg-muted group-hover:text-fg">
                  <span
                    aria-hidden="true"
                    className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])}
                  />
                  {FINDING_STATUS_LABELS[status] ?? status}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-fg">
                  {count}
                  <span className="ml-2 text-xs text-fg-faint">
                    {total > 0 ? pct(share) : '—'}
                  </span>
                </span>
              </div>

              <div
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-raised"
                role="presentation"
              >
                <div
                  className={cn('h-full rounded-full', TONE_DOT[tone])}
                  style={{ width: total > 0 ? `${Math.max(share * 100, count > 0 ? 1.5 : 0)}%` : '0%' }}
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
