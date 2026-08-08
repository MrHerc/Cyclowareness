/**
 * Everything that was done to this run, and by whom.
 *
 * Filtered to this object rather than pulled from the run itself: the audit
 * trail is written by the API in the same transaction as the change it
 * describes, so it is the only record on the page that cannot disagree with what
 * the database actually did.
 */

import { useT } from '../../../lib/i18n'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import type { AuditEvent } from '../../../domain/types'
import { formatDateTime, humanise, timeAgo } from '../../../lib/format'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../../components/states'
import { Button, Panel } from '../../../components/ui'

export interface RunAuditStripProps {
  runId: number
  events: AuditEvent[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** True when the API said more entries matched than it returned. */
  truncated: boolean
  total: number | undefined
}

export function RunAuditStrip({
  runId,
  events,
  isLoading,
  error,
  onRetry,
  truncated,
  total,
}: RunAuditStripProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.audit-trail')}
      subtitle={
        total === undefined
          ? t('p.every-material-change-recorded-against-this')
          : `${total} entr${total === 1 ? 'y' : 'ies'} recorded against this run.`
      }
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to={`/audit-log?object_type=loop_run&object_id=${runId}`}>{t('u.open-the-audit-log')}</Link>
        </Button>
      }
      footer={
        truncated
          ? t('p.more-entries-matched-than-are-shown')
          : undefined
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={events.length > 0 ? null : error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-the-audit-trail')}
        skeleton={
          <div className="divide-line">
            <SkeletonRow leading={false} />
            <SkeletonRow leading={false} />
            <SkeletonRow leading={false} />
          </div>
        }
        isEmpty={events.length === 0}
        empty={
          <EmptyState
            compact
            icon={ScrollText}
            headline={t('u.no-audit-entries-for-this-run')}
            description={t('x.entries-appear-when-a-person')}
          />
        }
      >
        <ol className="divide-line m-0 list-none p-0">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className="tech shrink-0 text-fg-faint">{formatDateTime(event.at)}</span>
              <span className="text-sm text-fg">{humanise(event.action)}</span>
              <span className="text-sm text-fg-muted">{event.summary}</span>
              <span className="ml-auto text-xs text-fg-subtle">
                {event.actor_email ?? 'Actor not recorded'} · {timeAgo(event.at)}
              </span>
            </li>
          ))}
        </ol>
      </AsyncBoundary>
    </Panel>
  )
}
