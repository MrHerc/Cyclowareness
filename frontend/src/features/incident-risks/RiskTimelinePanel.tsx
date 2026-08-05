/**
 * The history of this risk, read out of the audit trail.
 *
 * The server builds the timeline from `audit_events` rather than keeping a
 * second history on the risk — a timeline maintained beside the audit trail is
 * a timeline that can disagree with it, and the trail is the one an auditor
 * reads. That means every entry here is an event somebody is accountable for,
 * which is why the actor is on the line rather than in a tooltip.
 *
 * Subject-level moves are indented and labelled with the person, so a review
 * decision does not read as something that happened to the risk as a whole.
 */

import { useT } from '../../lib/i18n'
import { History } from 'lucide-react'
import { EmptyState } from '../../components/states'
import { Panel, Tooltip } from '../../components/ui'
import { formatDateTime, humanise, timeAgo } from '../../lib/format'
import { cn } from '../../lib/format'
import type { TimelineEntry } from './wire'

export interface RiskTimelinePanelProps {
  entries: TimelineEntry[]
}

export function RiskTimelinePanel({ entries }: RiskTimelinePanelProps) {
  const t = useT()
  return (
    <Panel
      headingLevel={2}
      title={t('x.timeline')}
      subtitle={t('x.every-audited-move-on-this')}
    >
      {entries.length === 0 ? (
        <EmptyState
          compact
          icon={History}
          headline="Nothing has happened yet"
          description={t('x.an-entry-appears-here-the')}
        />
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, index) => {
            const isSubject = entry.objectType === 'incident_risk_subject'
            return (
              <li
                key={`${entry.at}-${index}`}
                className={cn('relative flex gap-3 pb-5 last:pb-0', isSubject && 'pl-5')}
              >
                <span className="relative flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      isSubject ? 'bg-fg-subtle' : 'bg-brand',
                    )}
                  />
                  {index < entries.length - 1 && (
                    <span aria-hidden="true" className="w-px flex-1 bg-line" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-body font-medium text-fg">{humanise(entry.action)}</span>
                    <Tooltip content={formatDateTime(entry.at)}>
                      <span className="text-xs text-fg-faint">{timeAgo(entry.at)}</span>
                    </Tooltip>
                  </p>
                  {isSubject && entry.objectLabel && (
                    <p className="text-xs text-fg-subtle">{entry.objectLabel}</p>
                  )}
                  {entry.summary && (
                    <p className="mt-1 text-sm text-fg-muted">{entry.summary}</p>
                  )}
                  <p className="mt-1 text-xs text-fg-faint">{entry.actor}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
