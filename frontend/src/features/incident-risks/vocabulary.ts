/**
 * The incident-risk vocabulary, in one place.
 *
 * Two things live here rather than in the screens.
 *
 * **The option tables.** The list filter, the create form and the detail header
 * all name the same six risk types and four confidentiality levels. Three
 * copies of that list is three chances for one of them to offer a value the
 * server rejects with a 422 nobody can explain.
 *
 * **The redaction rule.** `REDACTED_CONFIDENTIALITY` mirrors the constant of
 * the same name in `backend/app/platform/models.py`, which is what
 * `IncidentRiskEmployeeView.of()` consults when it decides whether to withhold
 * the narrative and the evidence from the person the incident names. The
 * analyst screen shows what the employee will see, and it cannot ask the server
 * for that view — `/api/incident-risks/my` answers for the *caller*, and the
 * analyst is not a subject. So this is a deliberate mirror of a server rule,
 * and it is the one place in the feature that can drift from the backend. If
 * the server's tuple changes, change this one.
 */

import type {
  Confidentiality,
  IncidentRisk,
  IncidentRiskStatus,
  IncidentRiskSubject,
  IncidentRiskType,
  Severity,
} from '../../domain/types'
import type { SelectOption } from '../../components/ui'

/* ============================================================================
   Enumerations the server will accept
   ========================================================================== */

export const RISK_TYPES: readonly IncidentRiskType[] = [
  'user_action',
  'privileged_exposure',
  'data_mishandling',
  'procedure_failure',
  'alert_fatigue',
  'knowledge_gap',
]

const RISK_TYPE_LABELS: Record<IncidentRiskType, string> = {
  user_action: 'User action',
  privileged_exposure: 'Privileged exposure',
  data_mishandling: 'Data mishandling',
  procedure_failure: 'Procedure failure',
  alert_fatigue: 'Alert fatigue',
  knowledge_gap: 'Knowledge gap',
}

export function riskTypeLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return RISK_TYPE_LABELS[value as IncidentRiskType] ?? value.replace(/_/g, ' ')
}

export const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export const STATUSES: readonly IncidentRiskStatus[] = [
  'draft',
  'open',
  'assigned',
  'in_progress',
  'awaiting_review',
  'closed',
  'reopened',
]

export const CONFIDENTIALITIES: readonly Confidentiality[] = [
  'public',
  'internal',
  'restricted',
  'secret',
]

/* ============================================================================
   Redaction — the rule the employee view actually applies
   ========================================================================== */

/** Mirrors `REDACTED_CONFIDENTIALITY` in the backend's platform models. */
export const REDACTED_CONFIDENTIALITY: readonly Confidentiality[] = ['restricted', 'secret']

export function hidesIncidentDetail(level: Confidentiality | string | null | undefined): boolean {
  return REDACTED_CONFIDENTIALITY.includes(level as Confidentiality)
}

/**
 * What choosing this level does to the person named by the incident.
 *
 * Written as a consequence rather than as a definition: "restricted" tells an
 * analyst nothing, "the employee will not be shown what happened" tells them
 * exactly what they are deciding.
 */
export const CONFIDENTIALITY_CONSEQUENCE: Record<Confidentiality, string> = {
  public: 'The affected employee sees the full incident narrative and every piece of evidence.',
  internal: 'The affected employee sees the full incident narrative and every piece of evidence.',
  restricted:
    'The incident narrative and the evidence are withheld from the affected employee. They still see what they must do, by when, and who approved it.',
  secret:
    'The incident narrative and the evidence are withheld from the affected employee. They still see what they must do, by when, and who approved it.',
}

export function confidentialityLabel(level: string | null | undefined): string {
  if (!level) return '—'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

/* ============================================================================
   Select options
   ========================================================================== */

const ANY = { value: 'all', label: 'Any' }

export const RISK_TYPE_OPTIONS: SelectOption[] = RISK_TYPES.map((value) => ({
  value,
  label: RISK_TYPE_LABELS[value],
}))

export const SEVERITY_OPTIONS: SelectOption[] = SEVERITIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const STATUS_OPTIONS: SelectOption[] = STATUSES.map((value) => ({
  value,
  label: value === 'in_progress' ? 'In progress' : value === 'awaiting_review' ? 'Awaiting review' : value.charAt(0).toUpperCase() + value.slice(1),
}))

export const CONFIDENTIALITY_OPTIONS: SelectOption[] = CONFIDENTIALITIES.map((value) => ({
  value,
  label: confidentialityLabel(value),
}))

export const ANY_STATUS_OPTIONS: SelectOption[] = [ANY, ...STATUS_OPTIONS]
export const ANY_SEVERITY_OPTIONS: SelectOption[] = [ANY, ...SEVERITY_OPTIONS]
export const ANY_RISK_TYPE_OPTIONS: SelectOption[] = [ANY, ...RISK_TYPE_OPTIONS]

/* ============================================================================
   Legality of a state transition, as the server sees it
   ========================================================================== */

/**
 * Why an action is refused, or `null` when it is allowed.
 *
 * These duplicate the guards in `routers/incident_risks.py` so the control can
 * be disabled with the reason written next to it, rather than offering a button
 * whose only purpose is to produce a 409. The server remains the authority —
 * anything that slips past these still comes back as a conflict, and the
 * screens surface that message verbatim.
 */
export function whyCannotAssign(risk: IncidentRisk, subjectCount: number): string | null {
  if (risk.status === 'closed') {
    return 'This risk is closed. Reopen it before assigning anything.'
  }
  if (subjectCount === 0) {
    return 'No employees are attached to this risk yet. Attach the affected people first.'
  }
  return null
}

export function whyCannotClose(risk: IncidentRisk): string | null {
  if (risk.status === 'closed') return 'This risk is already closed.'
  if (risk.status === 'draft') {
    return 'This risk is still a draft, so nothing has been asked of anyone yet.'
  }
  return null
}

export function whyCannotReopen(risk: IncidentRisk): string | null {
  if (risk.status !== 'closed') {
    return `This risk is ${risk.status.replace(/_/g, ' ')}, not closed — there is nothing to reopen.`
  }
  return null
}

export function whyCannotReview(subject: IncidentRiskSubject): string | null {
  if (subject.status === 'assigned') {
    return 'This person has not started the required action, so there is nothing to review yet.'
  }
  return null
}

/* ============================================================================
   Subject completion, derived from the rows on screen
   ========================================================================== */

export interface SubjectRollup {
  total: number
  assigned: number
  completed: number
  awaitingReview: number
  accepted: number
  rejected: number
  unattached: number
  /** Null when nobody has recorded a score — never 0. */
  avgScore: number | null
  scored: number
  belowPassMark: number | null
}

/**
 * Rolled up from the subject rows this page already renders, not from a
 * separate summary field. A count derived from the same data the table shows
 * cannot disagree with the table.
 */
export function rollUpSubjects(
  subjects: IncidentRiskSubject[],
  minScore: number | null,
): SubjectRollup {
  const scores = subjects
    .map((s) => s.score)
    .filter((score): score is number => score !== null && Number.isFinite(score))

  return {
    total: subjects.length,
    assigned: subjects.filter((s) => s.status === 'assigned').length,
    completed: subjects.filter((s) => s.status === 'completed' || s.status === 'reviewed').length,
    awaitingReview: subjects.filter(
      (s) => s.status === 'completed' && s.reviewer_decision === 'pending',
    ).length,
    accepted: subjects.filter((s) => s.reviewer_decision === 'accepted').length,
    rejected: subjects.filter((s) => s.reviewer_decision === 'rejected').length,
    unattached: subjects.filter((s) => s.assignment_id === null).length,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    scored: scores.length,
    belowPassMark:
      minScore === null || scores.length === 0
        ? null
        : scores.filter((score) => score < minScore).length,
  }
}
