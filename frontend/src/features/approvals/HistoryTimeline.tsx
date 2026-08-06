/**
 * The approval thread, oldest first.
 *
 * Chronological rather than newest-first, unlike every other list in the
 * product: an endorsement, a revision request and the comment that answered it
 * only make sense read in the order they happened.
 *
 * These entries are the audit trail itself, not a copy of it — which is why a
 * comment shown here can be relied on to be the comment that was recorded.
 */

import { useT, type MessageKey } from '../../lib/i18n'
import { Check, MessageSquare, MessageSquareWarning, UserPlus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Panel } from '../../components/ui'
import { cn, formatDateTime, timeAgo } from '../../lib/format'
import type { HistoryAction, HistoryEntry } from './contract'

const ACTION: Record<HistoryAction, { icon: LucideIcon; tone: string; label: MessageKey }> = {
  approve: { icon: Check, tone: 'text-safe border-safe/40', label: 'p.approved' },
  reject: { icon: X, tone: 'text-critical border-critical/40', label: 'p.rejected' },
  request_revision: {
    icon: MessageSquareWarning,
    tone: 'text-medium border-medium/40',
    label: 'p.revision-requested',
  },
  endorse: {
    icon: UserPlus,
    tone: 'text-brand border-brand/40',
    label: 'p.endorsed-held-for-a-second-approver',
  },
  comment: { icon: MessageSquare, tone: 'text-fg-muted border-line', label: 'p.comment' },
}

export interface HistoryTimelineProps {
  entries: HistoryEntry[]
  /** True while the thread is still loading — an empty list would read as "none". */
  loading: boolean
}

export function HistoryTimeline({ entries, loading }: HistoryTimelineProps) {
  const t = useT()
  return (
    <Panel title={t('x.approval-history')} headingLevel={2} bodyClassName="space-y-0">
      {loading ? (
        <p className="text-sm text-fg-subtle">{t('p.loading-the-thread')}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-fg-subtle">{t('p.nothing-has-been-recorded-against-this')}</p>
      ) : (
        <ol className="relative space-y-5 pl-7">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-line-subtle"
          />
          {entries.map((entry, index) => {
            const spec = ACTION[entry.action]
            const Icon = spec.icon
            return (
              <li key={`${entry.at}-${index}`} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-7 top-0.5 flex size-6 items-center justify-center rounded-full border bg-surface',
                    spec.tone,
                  )}
                >
                  <Icon className="size-3" />
                </span>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className={cn('text-sm', spec.tone.split(' ')[0])}>{t(spec.label)}</span>
                    <span className="text-sm text-fg">{entry.actor}</span>
                    {entry.actorRole && (
                      <span className="text-xs text-fg-faint">{entry.actorRole}</span>
                    )}
                  </div>
                  <div className="text-xs text-fg-faint">
                    {formatDateTime(entry.at)} · {timeAgo(entry.at)}
                  </div>
                  {entry.comment && (
                    <p className="text-body text-fg-muted">{entry.comment}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
