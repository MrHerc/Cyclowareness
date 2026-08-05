/**
 * The raw audit entries for this object.
 *
 * The timeline above is the same trail read for a person; this is the same
 * trail read for an auditor — actor, address, and the before/after snapshot of
 * what actually changed. They are shown separately rather than merged because
 * they answer different questions, and folding the field-level diff into a
 * narrative timeline makes both harder to scan.
 *
 * The query is filtered server-side to this risk. Subject-level entries are
 * recorded against `incident_risk_subject`, so they appear in the timeline but
 * not here — the panel says so rather than letting the shorter list read as a
 * quieter history.
 */

import { useT } from '../../lib/i18n'
import { ScrollText } from 'lucide-react'
import { AsyncBoundary, EmptyState, SkeletonText } from '../../components/states'
import { Accordion, AccordionItem, CodeBlock, Panel } from '../../components/ui'
import { useAuditLog } from '../../lib/api/queries'
import { formatDateTime, humanise } from '../../lib/format'
import { auditSliceOf } from './wire'

export interface RiskAuditPanelProps {
  riskId: number
}

export function RiskAuditPanel({ riskId }: RiskAuditPanelProps) {
  const t = useT()
  const audit = useAuditLog({ object_type: 'incident_risk', object_id: riskId, limit: 50 })
  const slice = auditSliceOf(audit.data)

  return (
    <Panel
      headingLevel={2}
      title={t('x.audit-entries')}
      subtitle={
        slice.total !== null
          ? `${slice.events.length} of ${slice.total} entries recorded against this risk`
          : 'Recorded against this risk'
      }
    >
      <AsyncBoundary
        isLoading={audit.isLoading}
        error={audit.data ? null : audit.error}
        onRetry={() => void audit.refetch()}
        loadingLabel={t('x.loading-the-audit-trail')}
        skeleton={<SkeletonText lines={4} />}
        isEmpty={slice.events.length === 0}
        empty={
          <EmptyState
            compact
            icon={ScrollText}
            headline="No audit entry for this risk"
            description={t('x.the-api-writes-an-entry')}
          />
        }
      >
        <Accordion type="multiple">
          {slice.events.map((event) => (
            <AccordionItem
              key={event.id}
              value={String(event.id)}
              heading={humanise(event.action)}
              meta={formatDateTime(event.at)}
            >
              <div className="flex flex-col gap-3">
                <p className="text-sm text-fg-muted">{event.summary}</p>
                <p className="text-xs text-fg-faint">
                  {event.actor_email ?? 'Unattributed'}
                  {event.actor_role ? ` · ${event.actor_role}` : ''}
                  {event.ip_address ? ' · ' : ''}
                  {event.ip_address && <span className="tech">{event.ip_address}</span>}
                </p>
                {(event.before || event.after) && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CodeBlock
                      label="Before"
                      wrap
                      maxHeight="12rem"
                      value={JSON.stringify(event.before ?? null, null, 2)}
                    />
                    <CodeBlock
                      label="After"
                      wrap
                      maxHeight="12rem"
                      value={JSON.stringify(event.after ?? null, null, 2)}
                    />
                  </div>
                )}
              </div>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-4 text-xs text-fg-faint">
          Review decisions are recorded against the individual subject rather than the risk, so they
          appear in the timeline above and not in this list.
        </p>
      </AsyncBoundary>
    </Panel>
  )
}
