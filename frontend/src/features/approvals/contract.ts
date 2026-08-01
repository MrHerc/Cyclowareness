/**
 * The approval contract, normalised — and why that is necessary.
 *
 * `domain/types.ts` and `backend/app/schemas.py` describe this surface
 * differently. The server sends a paged envelope where the frozen type declares
 * a bare array; it names the verdict `threat_verdict`; it dates the wait from
 * `created_at` rather than `waiting_since`; and it carries three facts the
 * frozen shape has no room for — the derivation behind a severity label, the
 * sentence explaining an empty audience, and a *tri-state* on every safety
 * check.
 *
 * That last one is not cosmetic. The server reports a check it could not
 * perform as `checked: false, passed: null`, and the frozen shape has only
 * `passed: boolean`. Collapsing the two would render "we did not look" as "we
 * looked and found nothing" on the one screen where a person signs their name
 * to the outcome. So the tri-state survives to the pixel here.
 *
 * Neither side is edited. Both shapes are read, whichever arrives, and the
 * view-model below is the only thing the screens consume.
 */

import type {
  ApprovalDecision,
  LoopRunDetail,
  SandboxJobDetail,
  Severity,
  Threat,
  TrainingModule,
} from '../../domain/types'

/* ============================================================================
   Reading an unknown payload without lying about it
   ========================================================================== */

type Rec = Record<string, unknown>

const rec = (value: unknown): Rec =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {}

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** An empty string is an absent value here, not a value that happens to be blank. */
const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const numberOr = (value: unknown, fallback: number): number => numberOrNull(value) ?? fallback

const strings = (value: unknown): string[] => arr(value).filter((v): v is string => typeof v === 'string')

/** Anything the vocabulary does not contain is `null` — never coerced to a band. */
const SEVERITIES: readonly string[] = ['critical', 'high', 'medium', 'low', 'info']
const severityOrNull = (value: unknown): Severity | null =>
  typeof value === 'string' && SEVERITIES.includes(value) ? (value as Severity) : null

/** `first` wins; the alternate key is the other contract's name for the same fact. */
const pick = (source: Rec, first: string, second: string): unknown =>
  source[first] !== undefined && source[first] !== null ? source[first] : source[second]

/* ============================================================================
   The queue
   ========================================================================== */

export interface QueueRow {
  runId: number
  threatId: number | null
  threatTitle: string
  threatType: string | null
  verdict: string | null
  confidence: number | null
  severity: Severity | null
  /** The sentence explaining where the severity label came from, when sent. */
  severityBasis: string | null
  moduleId: number | null
  moduleTitle: string | null
  /** 'anthropic' | 'mock' | '' — never inferred from the presence of content. */
  generationSource: string
  generationLabel: string | null
  quizQuestions: number | null
  estMinutes: number | null
  proposedTargets: number | null
  waitingSince: string | null
  waitingSeconds: number
  assignedAnalyst: string | null
  /** A prior endorsement is holding this run for a different second approver. */
  awaitingSecondApproval: boolean
  endorsedBy: string | null
  sanitizationStatus: string | null
}

export interface QueuePage {
  rows: QueueRow[]
  /** How many are waiting in total, when the server says. `null` when it does not. */
  total: number | null
  /** True when the server returned a page rather than everything waiting. */
  truncated: boolean
}

function adaptRow(raw: unknown): QueueRow {
  const item = rec(raw)
  return {
    runId: numberOr(item.run_id, 0),
    threatId: numberOrNull(item.threat_id),
    threatTitle: text(item.threat_title) || 'Untitled artifact',
    threatType: textOrNull(item.threat_type),
    verdict: textOrNull(pick(item, 'threat_verdict', 'verdict')),
    confidence: numberOrNull(item.threat_confidence),
    severity: severityOrNull(item.severity),
    severityBasis: textOrNull(item.severity_basis),
    moduleId: numberOrNull(item.module_id),
    moduleTitle: textOrNull(item.module_title),
    generationSource: text(item.generation_source),
    generationLabel: textOrNull(item.generation_label),
    quizQuestions: numberOrNull(item.quiz_questions),
    estMinutes: numberOrNull(item.est_minutes),
    proposedTargets: numberOrNull(pick(item, 'proposed_target_count', 'proposed_targets')),
    waitingSince: textOrNull(pick(item, 'waiting_since', 'created_at')),
    waitingSeconds: numberOr(item.waiting_seconds, 0),
    assignedAnalyst: textOrNull(item.assigned_analyst),
    awaitingSecondApproval: item.awaiting_second_approval === true,
    endorsedBy: textOrNull(item.endorsed_by),
    sanitizationStatus: textOrNull(item.sanitization_status),
  }
}

export function adaptQueue(payload: unknown): QueuePage {
  if (Array.isArray(payload)) {
    return { rows: payload.map(adaptRow), total: payload.length, truncated: false }
  }
  const envelope = rec(payload)
  const rows = arr(envelope.items).map(adaptRow)
  return {
    rows,
    total: numberOrNull(envelope.total),
    truncated: envelope.truncated === true,
  }
}

/* ============================================================================
   The review workspace
   ========================================================================== */

/** `not_run` is a first-class outcome, not a failure and not a pass. */
export type SafetyCheckState = 'passed' | 'failed' | 'not_run'

export interface SafetyCheckView {
  name: string
  state: SafetyCheckState
  detail: string
}

export interface SafetyView {
  checks: SafetyCheckView[]
  passed: number
  failed: number
  notRun: number
  /** The server's own summary sentence, when it sends one. */
  summary: string | null
}

export interface AudienceMember {
  employeeId: number
  name: string
  departmentId: number | null
  riskScore: number | null
  reasons: string[]
  /** True only where the artifact actually reached this person. */
  exposed: boolean
}

export interface AnalysisView {
  verdict: string | null
  confidence: number | null
  threatType: string | null
  iocs: Record<string, string[]>
  behaviorSummary: string | null
  explanation: string | null
  /** The analyzer's raw report, when one was recorded. */
  engineReport: unknown
}

export interface SecondApprovalView {
  held: boolean
  endorsedBy: string[]
  note: string | null
}

export interface ReviewDetail {
  runId: number
  runStatus: string | null
  awaitingApproval: boolean
  createdAt: string | null
  waitingSeconds: number | null

  threat: Threat | null
  /** Attacker-authored. Carried as evidence to read, never as instructions. */
  artifactExcerpt: string
  artifactExcerptTruncated: boolean

  analysis: AnalysisView | null
  /** Why there is no analysis, in the server's words. Never an empty object. */
  analysisNote: string | null

  module: TrainingModule | null
  generationLabel: string | null

  severity: Severity | null
  severityBasis: string | null

  audience: AudienceMember[]
  targetingNote: string | null

  safety: SafetyView
  secondApproval: SecondApprovalView

  /** Only when the deployment links one. Absent is stated, never implied clean. */
  sandboxJob: SandboxJobDetail | null
  run: LoopRunDetail | null
}

function adaptSafetyCheck(raw: unknown): SafetyCheckView {
  const check = rec(raw)
  // The frozen shape names it `name` and has no `checked`; the server names it
  // `check` and reports `passed: null` for anything it could not run.
  const name = text(pick(check, 'check', 'name')) || 'Unnamed check'
  const ran = check.checked === undefined ? true : check.checked === true
  const passed = check.passed
  const state: SafetyCheckState = !ran || passed === null || passed === undefined
    ? 'not_run'
    : passed === true
      ? 'passed'
      : 'failed'
  return { name, state, detail: text(check.detail) }
}

function adaptSafety(raw: unknown): SafetyView {
  const safety = rec(raw)
  const checks = arr(safety.checks).map(adaptSafetyCheck)
  return {
    checks,
    passed: checks.filter((c) => c.state === 'passed').length,
    failed: checks.filter((c) => c.state === 'failed').length,
    notRun: checks.filter((c) => c.state === 'not_run').length,
    summary: textOrNull(safety.summary),
  }
}

function adaptAudience(raw: unknown): AudienceMember[] {
  return arr(raw).map((entry) => {
    const target = rec(entry)
    return {
      employeeId: numberOr(target.employee_id, 0),
      name: text(target.name) || 'Unnamed employee',
      departmentId: numberOrNull(target.department_id),
      riskScore: numberOrNull(target.risk_score),
      reasons: strings(target.reasons),
      exposed: target.exposed === true,
    }
  })
}

function adaptIocs(raw: unknown): Record<string, string[]> {
  const source = rec(raw)
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(source)) {
    const list = strings(value)
    if (list.length > 0) out[key] = list
  }
  return out
}

function adaptAnalysis(raw: unknown, threat: Threat | null): AnalysisView | null {
  const analysis = rec(raw)
  const hasAnalysisBlock = Object.keys(analysis).length > 0
  // The frozen contract has no `analysis` block at all — the same facts live on
  // the threat. Fall back to it rather than reporting "nothing was analysed".
  if (!hasAnalysisBlock) {
    if (!threat || !threat.verdict) return null
    return {
      verdict: threat.verdict,
      confidence: threat.confidence,
      threatType: threat.threat_type,
      iocs: adaptIocs(threat.iocs),
      behaviorSummary: threat.behavior_summary,
      explanation: threat.explanation,
      engineReport: null,
    }
  }
  return {
    verdict: textOrNull(analysis.verdict),
    confidence: numberOrNull(analysis.confidence),
    threatType: textOrNull(analysis.threat_type),
    iocs: adaptIocs(analysis.iocs),
    behaviorSummary: textOrNull(analysis.behavior_summary),
    explanation: textOrNull(pick(analysis, 'plain_language_explanation', 'explanation')),
    engineReport: analysis.engine_report ?? null,
  }
}

function adaptSecondApproval(raw: unknown): SecondApprovalView {
  const state = rec(raw)
  return {
    held: state.held === true,
    endorsedBy: strings(state.endorsed_by),
    note: textOrNull(state.note),
  }
}

export function adaptDetail(payload: unknown): ReviewDetail {
  const detail = rec(payload)
  const run = (detail.run ?? null) as LoopRunDetail | null
  const threat = (detail.threat ?? run?.threat ?? null) as Threat | null
  const module = (detail.module ?? run?.training_module ?? null) as TrainingModule | null

  return {
    runId: numberOr(pick(detail, 'run_id', 'id'), numberOr(rec(run).id, 0)),
    runStatus: textOrNull(pick(detail, 'run_status', 'status')) ?? textOrNull(rec(run).status),
    // Absent means unknown, not "already decided": default to the gate being open
    // only when the server or the run says so.
    awaitingApproval:
      detail.awaiting_approval === true ||
      (detail.awaiting_approval === undefined && rec(run).status === 'awaiting_approval'),
    createdAt: textOrNull(pick(detail, 'created_at', 'waiting_since')) ?? textOrNull(rec(run).created_at),
    waitingSeconds: numberOrNull(detail.waiting_seconds),

    threat,
    artifactExcerpt: text(detail.artifact_excerpt) || text(threat?.artifact_ref),
    artifactExcerptTruncated: detail.artifact_excerpt_truncated === true,

    analysis: adaptAnalysis(detail.analysis, threat),
    analysisNote: textOrNull(detail.analysis_note),

    module,
    generationLabel: textOrNull(detail.generation_label),

    severity: severityOrNull(detail.severity),
    severityBasis: textOrNull(detail.severity_basis),

    audience: adaptAudience(pick(detail, 'proposed_targets', 'targeting')),
    targetingNote: textOrNull(detail.targeting_note),

    safety: adaptSafety(detail.safety),
    secondApproval: adaptSecondApproval(detail.second_approval),

    sandboxJob: (detail.sandbox_job ?? null) as SandboxJobDetail | null,
    run,
  }
}

/* ============================================================================
   Approval history
   ========================================================================== */

export type HistoryAction = ApprovalDecision | 'endorse' | 'comment'

export interface HistoryEntry {
  at: string | null
  actor: string
  actorRole: string | null
  action: HistoryAction
  comment: string
}

/** `approval.request_revision` and a bare `request_revision` are the same event. */
function historyAction(raw: unknown): HistoryAction {
  const value = text(raw).replace(/^approval\./, '')
  if (value === 'approve' || value === 'reject' || value === 'request_revision') return value
  if (value === 'endorse') return 'endorse'
  return 'comment'
}

export function adaptHistory(payload: unknown): HistoryEntry[] {
  return arr(payload).map((raw) => {
    const entry = rec(raw)
    return {
      at: textOrNull(entry.at),
      actor: text(pick(entry, 'actor_email', 'actor')) || 'Unknown actor',
      actorRole: textOrNull(entry.actor_role),
      action: historyAction(pick(entry, 'action', 'decision')),
      comment: text(entry.comment),
    }
  })
}
