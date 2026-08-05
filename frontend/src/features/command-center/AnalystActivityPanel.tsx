/**
 * The last few material changes, and who made them.
 *
 * On an operations screen this answers a question the metrics cannot: whether
 * the queue is empty because the work is done or because a colleague cleared it
 * ninety seconds ago. The actor is always named — an audit line without an actor
 * is a log line, not an audit entry.
 */

import { useT } from '../../lib/i18n'
import { ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Button, Panel } from '../../components/ui'
import type { AuditEvent } from '../../domain/types'
import { humanise, timeAgo } from '../../lib/format'

export interface AnalystActivityPanelProps {
  events: AuditEvent[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function AnalystActivityPanel({
  events,
  isLoading,
  error,
  onRetry,
}: AnalystActivityPanelProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.recent-analyst-actions')}
      headingLevel={4}
      subtitle={t('x.written-by-the-api-on')}
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link to="/audit-log">Full audit log</Link>
        </Button>
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-recent-actions')}
        isEmpty={events.length === 0}
        empty={
          <EmptyState
            compact
            icon={ScrollText}
            headline="Nothing has been changed yet"
            description={t('x.approvals-policy-decisions-integration-chang')}
          />
        }
        skeleton={
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <SkeletonRow key={row} leading={false} trailing={false} />
            ))}
          </div>
        }
      >
        <ol className="divide-y divide-line-subtle">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-body text-fg-muted">{event.summary}</p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">
                  {event.actor_email ?? 'Actor not recorded'} · {humanise(event.action)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-fg-faint">{timeAgo(event.at)}</span>
            </li>
          ))}
        </ol>
      </AsyncBoundary>
    </Panel>
  )
}
