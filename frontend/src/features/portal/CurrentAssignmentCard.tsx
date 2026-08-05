/**
 * The one thing this screen is for.
 *
 * An employee portal that leads with points and badges is a game with a
 * security theme. This card is the page's only `feature` panel, and everything
 * it carries answers a question the person actually has: what am I being asked
 * to do, why me, by when, and who decided this was worth my time.
 *
 * The "why" is not editorial. `targeting_reasons` are the exact strings the risk
 * engine wrote when it selected this person, so what the employee reads is what
 * the analyst saw at the approval gate.
 */

import { CalendarClock, Clock, ShieldCheck, Target, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import { Badge, Button, Panel } from '../../components/ui'
import { provenanceOf, type AssignmentDetail, type MyIncidentRisk } from '../../domain/types'
import { channelLabel, deadlineIn, formatDate, num } from '../../lib/format'

export interface CurrentAssignmentCardProps {
  assignment: AssignmentDetail
  /** The incident risk that forced this assignment, when one did. */
  incident: MyIncidentRisk | null
  /** `capabilities.ai_provider === 'anthropic'`. Undefined until it answers. */
  modelConnected?: boolean
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <span className="label flex items-center gap-1.5 text-fg-subtle">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </span>
      <p className="mt-1.5 text-body text-fg">{children}</p>
    </div>
  )
}

export function CurrentAssignmentCard({
  assignment,
  incident,
  modelConnected,
}: CurrentAssignmentCardProps) {
  const { module } = assignment
  const started = assignment.status === 'in_progress'
  const due = deadlineIn(incident?.deadline ?? null)
  const approved = module.status === 'approved'

  return (
    <Panel
      tone="feature"
      title={module.title}
      subtitle={`Assigned ${formatDate(assignment.assigned_at)} · ${channelLabel(module.channel)}`}
      actions={
        <Badge status={assignment.status} dot>
          {started ? 'In progress' : 'Not started'}
        </Badge>
      }
    >
      <div className="space-y-6">
        <p className="text-lead text-fg-muted">{module.description}</p>

        <div>
          <h3 className="text-h text-fg">Why you received this</h3>
          {assignment.targeting_reasons.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {assignment.targeting_reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2.5 text-body text-fg-muted">
                  <Target
                    className="mt-1 size-3.5 shrink-0 text-brand"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body text-fg-subtle">
              No selection reasons were recorded against this assignment, so this screen cannot tell
              you why you were chosen. Your security team can.
            </p>
          )}

          {module.threat_id !== null ? (
            <p className="mt-3 text-sm text-fg-subtle">
              This module was written from a real threat your security team analysed
              {module.ai_generated ? ' and converted into safe training' : ''}. The threat record
              itself is held by the security team and is not shown here.
            </p>
          ) : null}
        </div>

        {incident ? (
          <div className="rounded-control border border-line bg-base px-4 py-3">
            <p className="text-sm text-fg-muted">
              This assignment carries an incident-response obligation:{' '}
              <span className="text-fg">{incident.title}</span>. It is reviewed by an analyst after
              you complete it.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 border-t border-line-subtle pt-5 sm:grid-cols-3">
          <Fact icon={CalendarClock} label="Due">
            {incident ? (
              <span className={due.overdue ? 'text-critical' : undefined}>
                {formatDate(incident.deadline)} · {due.text}
              </span>
            ) : (
              <span className="text-fg-subtle">
                No due date — this deployment does not set one on training assignments
              </span>
            )}
          </Fact>

          <Fact icon={Clock} label="Estimated time">
            {module.est_minutes > 0 ? (
              `${module.est_minutes} minutes`
            ) : (
              <span className="text-fg-subtle">Not recorded</span>
            )}
          </Fact>

          <Fact icon={Target} label="Score you must reach">
            {incident?.min_score !== null && incident?.min_score !== undefined ? (
              `${num(incident.min_score, 0)}%`
            ) : (
              <span className="text-fg-subtle">Not specified for this assignment</span>
            )}
          </Fact>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle pt-5">
          <Button asChild variant="primary" size="lg">
            <Link to={`/portal/training/${assignment.id}`}>
              {started ? 'Continue training' : 'Start training'}
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <AIProvenanceBadge
              provenance={provenanceOf(module.generation_source, { approved })}
              generationSource={module.generation_source}
              modelConnected={modelConnected}
            />
            {approved ? (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-xs text-fg-muted">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                Approved by {module.approved_by ?? 'an analyst'}
              </span>
            ) : (
              <Badge status={module.status} size="sm" />
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
