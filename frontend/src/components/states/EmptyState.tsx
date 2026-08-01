/**
 * Nothing here — and why.
 *
 * `description` is required on purpose. "No data" is not an empty state, it is
 * a dead end: it leaves the person looking at it unable to tell an unused
 * feature from a broken one. Every empty state in this product has to say what
 * would put something here ("Approvals appear when a loop reaches stage 4"),
 * which also makes an unconfigured demo legible to someone seeing it once.
 */

import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface EmptyStateProps {
  /** Defaults to an inbox. Pass the icon of the thing that is missing. */
  icon?: LucideIcon
  headline: string
  /** One sentence: what would cause something to appear here. */
  description: string
  /** The one thing to do about it — usually a `StateAction` or a router link. */
  action?: ReactNode
  /** Inline variant for inside a card, without the panel frame. */
  compact?: boolean
  className?: string
}

/**
 * An empty result, explained.
 *
 * The icon is muted rather than branded: an empty list is not the thing on the
 * screen worth pointing at, and cyan here would compete with whatever the
 * analyst is actually meant to look at next.
 */
export function EmptyState({
  icon: Icon = Inbox,
  headline,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact
          ? 'gap-3 py-6'
          : 'gap-4 rounded-panel border border-line-subtle bg-surface px-6 py-14 shadow-panel',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full border border-line-subtle bg-elevated"
      >
        <Icon className="size-5 text-fg-subtle" strokeWidth={1.5} />
      </span>

      <div className="max-w-md space-y-2">
        <h2 className="text-h text-fg">{headline}</h2>
        <p className="text-body text-fg-muted">{description}</p>
      </div>

      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
