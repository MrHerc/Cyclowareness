/**
 * Risk raised by incident response against named people.
 *
 * Ordered by deadline rather than by severity: these carry a closure date that
 * someone has committed to, and an overdue medium is a governance failure in a
 * way that an open critical with three weeks left is not. Records with no
 * deadline sort last, and say so instead of being given an implied one.
 */

import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Badge, Button, Panel } from '../../components/ui'
import type { IncidentRisk } from '../../domain/types'
import { cn, deadlineIn, humanise } from '../../lib/format'

const SHOWN = 5

export interface IncidentRiskPanelProps {
  risks: IncidentRisk[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

/** Missing deadlines sink to the bottom; they are not "due never". */
function byDeadline(a: IncidentRisk, b: IncidentRisk): number {
  if (a.deadline === b.deadline) return 0
  if (a.deadline === null) return 1
  if (b.deadline === null) return -1
  return a.deadline.localeCompare(b.deadline)
}

export function IncidentRiskPanel({ risks, isLoading, error, onRetry }: IncidentRiskPanelProps) {
  const ordered = [...risks].sort(byDeadline)
  const shown = ordered.slice(0, SHOWN)

  return (
    <Panel
      title="Incident risk assignments"
      subtitle={`${risks.length} open ${risks.length === 1 ? 'record' : 'records'} raised against people`}
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link to="/incident-risks">All incident risks</Link>
        </Button>
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading incident risks"
        isEmpty={shown.length === 0}
        empty={
          <EmptyState
            compact
            icon={ShieldAlert}
            headline="Nothing is open"
            description="Incident response raises a record here when an investigation identifies a person-level risk that needs a remedial action."
          />
        }
        skeleton={
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <SkeletonRow key={row} leading={false} />
            ))}
          </div>
        }
      >
        <ul className="divide-y divide-line-subtle">
          {shown.map((risk) => {
            const due = deadlineIn(risk.deadline)
            return (
              <li key={risk.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/incident-risks/${risk.id}`}
                    className="min-w-0 text-body text-fg underline-offset-4 hover:underline"
                  >
                    <span className="block truncate">{risk.title}</span>
                  </Link>
                  <span
                    className={cn(
                      'shrink-0 text-xs',
                      due.overdue ? 'text-critical' : 'text-fg-faint',
                    )}
                  >
                    {due.text}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge status={risk.severity} size="sm" />
                  <Badge status={risk.status} size="sm" />
                  <span className="text-xs text-fg-subtle">
                    {humanise(risk.risk_type)}
                    {risk.subject_count !== undefined
                      ? ` · ${risk.subject_count} ${risk.subject_count === 1 ? 'person' : 'people'}`
                      : ''}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </AsyncBoundary>
    </Panel>
  )
}
