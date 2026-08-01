/**
 * Where the declared response shape and the shape on the wire disagree.
 *
 * Three of the incident-risk responses carry more — or differently — than
 * `domain/types.ts` declares, and the screens must not pretend otherwise:
 *
 * - `GET /api/incident-risks` answers with a **page envelope**
 *   (`{items, total, limit, offset, truncated}`), while `useIncidentRisks` is
 *   typed `IncidentRisk[]`. Rendering `data.map(...)` against that produces an
 *   empty list with no error — the worst possible failure, because it looks
 *   like "no incidents".
 * - A timeline entry is read out of the audit trail and arrives with
 *   `actor_email` / `actor_role`, not the declared `actor`.
 * - `GET /api/audit` answers with `{events, total, limit}`.
 *
 * Each adapter accepts either shape and narrows through `unknown` rather than
 * casting, so a future server change that drops the envelope keeps working
 * instead of throwing. The mismatches themselves belong in the API layer; these
 * functions exist so the screens are correct while they are still there.
 */

import type { AuditEvent, AuditPage, IncidentRisk, IncidentRiskDetail } from '../../domain/types'

/* ============================================================================
   The list
   ========================================================================== */

export interface IncidentRiskListPage {
  items: IncidentRisk[]
  /** Rows matching the filter server-side. Null when the shape did not say. */
  total: number | null
  /** True when the server returned fewer rows than it matched. */
  truncated: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function incidentRiskPageOf(data: IncidentRisk[] | undefined): IncidentRiskListPage {
  const raw: unknown = data
  if (Array.isArray(raw)) {
    return { items: raw as IncidentRisk[], total: raw.length, truncated: false }
  }
  if (isRecord(raw) && Array.isArray(raw.items)) {
    return {
      items: raw.items as IncidentRisk[],
      total: typeof raw.total === 'number' ? raw.total : null,
      truncated: raw.truncated === true,
    }
  }
  return { items: [], total: null, truncated: false }
}

/* ============================================================================
   The timeline
   ========================================================================== */

export interface TimelineEntry {
  at: string
  actor: string
  action: string
  summary: string
  /** 'incident_risk' or 'incident_risk_subject' — a subject move is indented. */
  objectType: string
  objectLabel: string
}

export function timelineOf(detail: IncidentRiskDetail | undefined): TimelineEntry[] {
  const raw: unknown = detail?.timeline
  if (!Array.isArray(raw)) return []
  return raw.filter(isRecord).map((row) => ({
    at: typeof row.at === 'string' ? row.at : '',
    // `actor` is what the type declares; `actor_email` is what arrives.
    actor:
      (typeof row.actor === 'string' && row.actor) ||
      (typeof row.actor_email === 'string' && row.actor_email) ||
      'Unattributed',
    action: typeof row.action === 'string' ? row.action : '',
    summary: typeof row.summary === 'string' ? row.summary : '',
    objectType: typeof row.object_type === 'string' ? row.object_type : 'incident_risk',
    objectLabel: typeof row.object_label === 'string' ? row.object_label : '',
  }))
}

/* ============================================================================
   The audit trail
   ========================================================================== */

export interface AuditSlice {
  events: AuditEvent[]
  total: number | null
  truncated: boolean
}

export function auditSliceOf(data: AuditPage | AuditEvent[] | undefined): AuditSlice {
  const raw: unknown = data
  if (Array.isArray(raw)) {
    return { events: raw as AuditEvent[], total: raw.length, truncated: false }
  }
  if (isRecord(raw) && Array.isArray(raw.events)) {
    const events = raw.events as AuditEvent[]
    const total = typeof raw.total === 'number' ? raw.total : null
    return {
      events,
      total,
      truncated: raw.truncated === true || (total !== null && total > events.length),
    }
  }
  return { events: [], total: null, truncated: false }
}

/* ============================================================================
   The assign result
   ========================================================================== */

export interface AssignedSubject {
  subject_id: number
  employee_id: number
  employee_name: string
  assignment_id: number
}

export interface SkippedSubject {
  subject_id: number
  employee_id: number
  employee_name: string
  /** A sentence, not a code. It is shown to the analyst verbatim. */
  reason: string
}

export interface RequirementOutcome {
  requirement: string
  fulfilled: boolean
  /** What carries it, or '' when nothing in this deployment does. */
  mechanism: string
  detail: string
}

/**
 * `POST /assign` reports every requirement the incident declared, met or not.
 * That is the whole value of the response: an incident demanding a sandbox
 * exercise gets told, in words, that nothing here can assign one.
 */
export interface AssignResult {
  incident_risk_id: number
  module_id: number | null
  module_title: string
  assigned: AssignedSubject[]
  skipped: SkippedSubject[]
  requirements: RequirementOutcome[]
  status: string
  detail: string
}

export function assignResultOf(data: unknown): AssignResult | null {
  if (!isRecord(data)) return null
  if (!Array.isArray(data.assigned) || !Array.isArray(data.skipped)) return null
  return {
    incident_risk_id: typeof data.incident_risk_id === 'number' ? data.incident_risk_id : 0,
    module_id: typeof data.module_id === 'number' ? data.module_id : null,
    module_title: typeof data.module_title === 'string' ? data.module_title : '',
    assigned: data.assigned as AssignedSubject[],
    skipped: data.skipped as SkippedSubject[],
    requirements: Array.isArray(data.requirements)
      ? (data.requirements as RequirementOutcome[])
      : [],
    status: typeof data.status === 'string' ? data.status : '',
    detail: typeof data.detail === 'string' ? data.detail : '',
  }
}
