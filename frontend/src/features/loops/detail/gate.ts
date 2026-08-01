/**
 * Reading the human decision off the audit trail.
 *
 * The approval endpoint writes the decision, the actor and the comment into the
 * audit log in the same transaction as the state change, so the trail is the
 * record — there is no separate decision table to read. A run can also be
 * released through the older `/loop-runs/{id}/approve` route, which writes no
 * audit entry; that produces `null` here, and the timeline says the reviewer was
 * not recorded rather than inventing one.
 */

import type { ApprovalDecision, AuditEvent, AuditPage } from '../../../domain/types'
import type { LoopGateRecord } from '../../../components/loop'

const DECISION_ACTIONS: Record<string, ApprovalDecision> = {
  'approval.approve': 'approve',
  'approval.reject': 'reject',
  'approval.request_revision': 'request_revision',
}

/** `/api/audit` answers with a page; older deployments answered with an array. */
export function auditEvents(data: AuditPage | AuditEvent[] | undefined): AuditEvent[] {
  if (!data) return []
  return Array.isArray(data) ? data : (data.events ?? [])
}

/** The latest decision recorded against this run, or `null` if none was. */
export function gateFrom(events: readonly AuditEvent[]): LoopGateRecord | null {
  // The trail comes back newest first, so the first match is the standing decision.
  const event = events.find((entry) => entry.action in DECISION_ACTIONS)
  if (!event) return null
  return {
    decision: DECISION_ACTIONS[event.action] ?? null,
    actor: event.actor_email,
    at: event.at,
    comment: event.summary,
  }
}
