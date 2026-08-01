/**
 * One finding, as something you can act on rather than read about.
 *
 * The card leads with severity and the deadline because those are the two
 * facts that decide whether it is today's problem. Confidence sits next to the
 * title rather than in the body: a critical finding at low confidence and a
 * critical finding at high confidence are different instructions, and burying
 * the difference is how a queue gets worked in the wrong order.
 *
 * The whole card is one link. A card with a nested "view" button gives the same
 * destination two tab stops and no extra capability.
 */

import { ArrowUpRight, CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfidenceBadge } from '../../components/data'
import { Badge, Card } from '../../components/ui'
import type { PolicyFinding } from '../../domain/types'
import { cn, deadlineIn, timeAgo, truncate } from '../../lib/format'
import { FINDING_TYPE_LABELS, sourceLabel } from './vocabulary'

export interface FindingCardProps {
  finding: PolicyFinding
  /** Resolved policy name, when the caller has the library loaded. */
  policyName?: string | null
  className?: string
}

export function FindingCard({ finding, policyName, className }: FindingCardProps) {
  const due = deadlineIn(finding.due_date)
  const name = policyName ?? finding.policy_name ?? null

  return (
    <Card asChild className={cn('group', className)}>
      <Link to={`/policy-intelligence/findings/${finding.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={finding.severity} size="sm" dot />
            <span className="text-xs text-fg-subtle">
              {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
            </span>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-fg-faint transition-colors group-hover:text-brand"
            aria-hidden="true"
          />
        </div>

        <h3 className="mt-2 text-lead text-fg">{finding.title}</h3>

        {finding.description ? (
          <p className="mt-1.5 text-sm text-fg-muted">{truncate(finding.description, 190)}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
          <Badge status={finding.status} size="sm" />
          <ConfidenceBadge value={finding.confidence} />
          {name ? <span className="truncate">{name}</span> : null}
          {finding.technology ? <span className="tech text-fg-faint">{finding.technology}</span> : null}
          <span>{sourceLabel(finding.source)}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className={cn('inline-flex items-center gap-1.5', due.overdue ? 'text-high' : 'text-fg-subtle')}>
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {finding.due_date ? due.text : 'No due date'}
          </span>
          <span className="text-fg-faint">Detected {timeAgo(finding.detected_at)}</span>
          {finding.owner_name ? <span className="text-fg-faint">Owner {finding.owner_name}</span> : null}
        </div>
      </Link>
    </Card>
  )
}
