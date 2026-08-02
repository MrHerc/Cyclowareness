/**
 * Work that incident response raised against this person.
 *
 * This is the one place in the portal where the product deliberately shows less
 * than it knows. Above `internal` confidentiality the narrative and the evidence
 * name other people and other systems, so the server withholds them and sends
 * `redacted` with a reason. The failure to avoid is rendering that as a blank
 * description: "there is nothing here" and "you are not cleared to read this"
 * are different facts, and only one of them is true.
 *
 * What is never withheld: the obligation, the deadline, the score to reach, and
 * who to ask. An employee held to a deadline they cannot see is not a control.
 */

import { EyeOff, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Panel } from '../../components/ui'
import { EmptyState } from '../../components/states'
import type { MyIncidentRisk } from '../../domain/types'
import { deadlineIn, formatDate, num } from '../../lib/format'
import { isIncidentWorkOpen } from './incidentWork'

export interface IncidentObligationsProps {
  items: MyIncidentRisk[]
}

function Obligation({ item }: { item: MyIncidentRisk }) {
  const due = deadlineIn(item.deadline)
  const open = isIncidentWorkOpen(item)

  return (
    <li className="rounded-panel border border-line bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h text-fg">{item.title}</h3>
          {item.approver_name ? (
            <p className="mt-1 text-xs text-fg-faint">
              Signed off by {item.approver_name}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge status={item.severity} size="sm" />
          {/* `my_status`, not `status`. The latter is the investigation's
              lifecycle; showing it here told someone who had finished and
              been accepted that they were still assigned. */}
          <Badge status={item.my_status} size="sm" dot />
        </div>
      </div>

      {item.redacted ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-control border border-line-subtle bg-base px-3 py-2.5">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <p className="text-sm text-fg-muted">
            {item.redaction_note ??
              'The detail of this incident is restricted and is not shown in this view.'}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {item.description ? (
            <p className="text-body text-fg-muted">{item.description}</p>
          ) : null}
          {item.evidence && item.evidence.length > 0 ? (
            <ul className="space-y-1">
              {item.evidence.map((line) => (
                <li key={line} className="text-sm text-fg-muted">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {item.required_action ? (
        <div className="mt-3">
          <span className="label text-fg-subtle">What you must do</span>
          <p className="mt-1 text-body text-fg">{item.required_action}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-subtle pt-3 text-sm">
        <span className="text-fg-muted">
          <span className="text-fg-subtle">Deadline: </span>
          {item.deadline ? (
            <span className={due.overdue ? 'text-critical' : 'text-fg'}>
              {formatDate(item.deadline)} · {due.text}
            </span>
          ) : (
            <span className="text-fg-subtle">none set</span>
          )}
        </span>
        <span className="text-fg-muted">
          <span className="text-fg-subtle">Score to reach: </span>
          {item.min_score === null ? (
            <span className="text-fg-subtle">not specified</span>
          ) : (
            <span className="text-fg">{num(item.min_score, 0)}%</span>
          )}
        </span>
        {item.my_score !== null ? (
          <span className="text-fg-muted">
            <span className="text-fg-subtle">You scored: </span>
            <span className="text-fg">{num(item.my_score, 0)}%</span>
          </span>
        ) : null}
        {/* This payload carries no assignment id, so there is nothing to
            deep-link to. It used to build `/portal/training/${undefined}`,
            which rendered an error page. The training list is reachable and
            true; a broken deep link is neither. */}
        {item.requires_training && open ? (
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/portal">Go to your training</Link>
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function IncidentObligations({ items }: IncidentObligationsProps) {
  return (
    <Panel
      title="Assigned by incident response"
      subtitle="Raised by an analyst against a specific incident, and reviewed by one when you finish."
      headingLevel={2}
    >
      {items.length === 0 ? (
        <EmptyState
          compact
          icon={ShieldAlert}
          headline="Nothing has been raised against you"
          description="Work appears here when an analyst attaches you to an incident — for example after a real threat reached your inbox and needed a documented response."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <Obligation key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
