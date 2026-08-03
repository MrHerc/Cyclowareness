/**
 * The domain, in one place.
 *
 * These types mirror `backend/app/schemas.py`, `backend/app/sandbox/schemas.py`
 * and `backend/app/platform/schemas.py`. They are the contract between the two
 * halves of the product, so a field that does not exist on the server does not
 * exist here — an optimistic interface is how a UI ends up confidently
 * rendering `undefined`.
 *
 * Where a value can genuinely be absent, it is `| null` and every reader is
 * expected to handle it. That is not defensive noise: "no measurement" and
 * "measured zero" are different facts, and this product refuses to conflate
 * them (see `components/data/HonestMetric`).
 */

/* ============================================================================
   Identity and access
   ========================================================================== */

export type RoleName = 'analyst' | 'employee' | 'executive'

export interface Session {
  access_token: string
  token_type?: string
  role: RoleName
  email: string
  employee_id: number | null
  employee_name: string | null
}

/** `/api/auth/me` — identity only. It deliberately does not mint a token. */
export interface Identity {
  role: RoleName
  email: string
  employee_id: number | null
  employee_name: string | null
}

/** What this deployment can actually do. Read once at startup. */
export interface Capabilities {
  demo_mode: boolean
  ai_provider: 'anthropic' | 'mock'
  analyzer: string
}

/* ============================================================================
   Severity, risk and the shared vocabulary
   ========================================================================== */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type Verdict = 'malicious' | 'suspicious' | 'benign'
export type RiskBand = 'low' | 'elevated' | 'high'

/* ============================================================================
   People
   ========================================================================== */

export type EmployeeStatus = 'active' | 'on_leave' | 'left'

export interface Employee {
  id: number
  name: string
  email: string
  department_id: number
  role_title: string
  role_sensitivity: number
  current_risk_score: number
  status?: EmployeeStatus
}

export interface RiskFactor {
  factor: string
  label: string
  contribution: number
  events: number
}

export interface RiskEvent {
  id: number
  type: string
  delta: number
  reason: string
  loop_run_id: number | null
  created_at: string
}

export interface EmployeeDetail extends Employee {
  department_name: string
  risk_breakdown: RiskFactor[]
  recent_events: RiskEvent[]
}

export interface DepartmentRisk {
  id: number
  name: string
  avg_risk: number
  employee_count: number
  high_risk_count: number
}

/* ============================================================================
   The loop
   ========================================================================== */

export type LoopStatus =
  | 'running'
  | 'awaiting_approval'
  | 'awaiting_training'
  | 'completed'
  | 'failed'

export type StageStatus = 'in_progress' | 'completed' | 'failed'

export interface StageEntry {
  stage: number
  name: string
  status: StageStatus
  started_at: string | null
  completed_at: string | null
  detail: string
  error: string | null
}

export interface Target {
  employee_id: number
  name: string
  department_id: number
  risk_score: number
  reasons: string[]
  /** True only when the artifact actually reached this person. */
  exposed?: boolean
}

export interface MeasureSummary {
  assigned: number
  completed: number
  completion_rate: number
  avg_score: number | null
  avg_time_seconds: number | null
  risk_delta_total: number
  per_employee: {
    employee_id: number
    name: string
    status: string
    score: number | null
    risk_delta: number
    risk_score_now: number | null
  }[]
}

export interface LoopRun {
  id: number
  trigger_threat_id: number
  current_stage: number
  status: LoopStatus
  stage_history: StageEntry[]
  training_module_id: number | null
  report_id: number | null
  targeting: Target[]
  measure_summary: MeasureSummary | null
  created_at: string
  completed_at: string | null
}

export interface RunSummary {
  id: number
  status: LoopStatus
  current_stage: number
  stage_history: StageEntry[]
  threat_title: string
  threat_type: string | null
  verdict: string | null
  source: string | null
  targets: number
  created_at: string
  completed_at: string | null
}

export interface LoopRunDetail extends LoopRun {
  threat: Threat | null
  training_module: TrainingModule | null
  assignments: {
    id: number
    employee_id: number
    employee_name: string
    status: string
    score: number | null
    targeting_reasons: string[]
    completed_at: string | null
  }[]
}

/** The seven stages. The single source of truth for every loop visual. */
export const STAGES = [
  { n: 1, key: 'ingest', label: 'Intake', hint: 'Human sensor, feed, API', owner: 'Platform' },
  { n: 2, key: 'analyze', label: 'Analysis', hint: 'Sandbox verdict and IOCs', owner: 'Sandbox' },
  { n: 3, key: 'convert', label: 'Conversion', hint: 'Threat becomes safe training', owner: 'AI' },
  { n: 4, key: 'target', label: 'Targeting', hint: 'The people actually at risk', owner: 'Risk engine' },
  { n: 5, key: 'train', label: 'Training', hint: 'Delivery and completion', owner: 'Employee' },
  { n: 6, key: 'measure', label: 'Measurement', hint: 'Behaviour, not attendance', owner: 'Platform' },
  { n: 7, key: 'feedback', label: 'Feedback', hint: 'Evidence updates the model', owner: 'Risk engine' },
] as const

/** Where the human approval gate sits: between CONVERT (3) and TARGET (4). */
export const APPROVAL_GATE_AFTER_STAGE = 3

/* ============================================================================
   Threats
   ========================================================================== */

export type ThreatSource = 'human_sensor' | 'feed' | 'manual'

export interface Threat {
  id: number
  source: ThreatSource
  artifact_type: string
  artifact_ref: string
  artifact_meta: Record<string, unknown>
  title: string
  verdict: Verdict | null
  confidence: number | null
  threat_type: string | null
  iocs: {
    urls?: string[]
    domains?: string[]
    hashes?: string[]
    sender_patterns?: string[]
  } | null
  behavior_summary: string | null
  explanation: string | null
  reported_by_employee_id: number | null
  created_at: string
}

/* ============================================================================
   Training
   ========================================================================== */

export type ModuleStatus = 'pending_review' | 'approved' | 'rejected'
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'expired'

export interface QuizQuestion {
  question: string
  options: string[]
  /** Absent on employee-facing payloads — the answer key never ships to the taker. */
  correct_index?: number
  explanation?: string
}

export interface TrainingModule {
  id: number
  threat_id: number | null
  title: string
  description: string
  content: { heading: string; body: string }[]
  quiz: QuizQuestion[]
  takeaway: string
  channel: string
  est_minutes: number
  ai_generated: boolean
  /** Which engine wrote it: 'anthropic' | 'mock' | '' (human-authored). */
  generation_source: string
  status: ModuleStatus
  approved_by: string | null
  created_at: string
}

export interface Assignment {
  id: number
  module_id: number
  employee_id: number
  loop_run_id: number | null
  status: AssignmentStatus
  score: number | null
  time_spent_seconds: number | null
  targeting_reasons: string[]
  assigned_at: string
  completed_at: string | null
}

export interface AssignmentDetail extends Assignment {
  module: TrainingModule
  employee_name: string
}

export interface QuizResult {
  score: number
  correct: number
  total: number
  passed: boolean
  per_question: {
    index: number
    correct: boolean
    correct_index: number
    explanation: string
  }[]
  risk_delta: number
  new_risk_score: number
}

/* ============================================================================
   The human sensor
   ========================================================================== */

export type ReportStatus = 'new' | 'in_loop' | 'dismissed'

export interface TriageSummary {
  summary: string
  suspicion_level: 'high' | 'medium' | 'low'
  indicators: string[]
  likely_iocs: { urls?: string[]; domains?: string[]; sender_patterns?: string[] }
  recommended_action: string
  /** Which engine produced it. Absent on rows triaged before the field existed. */
  source?: string
}

export interface Report {
  id: number
  employee_id: number
  artifact_type: string
  artifact_ref: string
  artifact_meta: Record<string, unknown>
  note: string
  status: ReportStatus
  triage_summary: TriageSummary | null
  linked_threat_id: number | null
  linked_loop_run_id: number | null
  created_at: string
  employee_name?: string
  department_name?: string
  /** False when the daily credit cap meant this report did not move the score.
   *  `risk_credit_note` says why. The cap used to be invisible, so the fourth
   *  report in a day still told the reporter their score had gone down —
   *  a falsehood aimed at the one behaviour the product most wants. */
  risk_credited?: boolean
  risk_credit_note?: string
}

/* ============================================================================
   Simulations
   ========================================================================== */

export type SimulationStatus = 'draft' | 'active' | 'completed'
export type SimOutcome = 'pending' | 'clicked' | 'reported' | 'ignored'

export interface Simulation {
  id: number
  name: string
  template_threat_id: number | null
  lure_template_id: string | null
  lure_preview: string
  channel: string
  status: SimulationStatus
  launched_at: string | null
  completed_at: string | null
  created_at: string
}

export interface SimulationDetail extends Simulation {
  targets: {
    id: number
    employee_id: number
    employee_name: string
    department: string
    risk_score: number | null
    outcome: SimOutcome
    outcome_at: string | null
  }[]
  stats: {
    targets: number
    resolved: number
    clicked: number
    reported: number
    /** The server's own floor. A rate below this many resolved targets is
     *  withheld, matching the trailing-window metrics on the command centre. */
    min_sample: number
    click_rate: number | null
    report_rate: number | null
  }
}

export interface SimTemplate {
  id: string
  name: string
  channel: string
  threat_type: string
  difficulty: string
  description: string
  sample_lure: string
}

/* ============================================================================
   Intel feed (the curated input feed that predates Threat Intelligence)
   ========================================================================== */

export interface FeedItem {
  id: number
  title: string
  summary: string
  threat_type: string
  severity: Severity
  source_name: string
  published_at: string
  iocs: Record<string, string[]>
  artifact_example: string
  artifact_type: string
  pushed_to_loop: boolean
}

/* ============================================================================
   Metrics — every rate carries its own sample size
   ========================================================================== */

/**
 * Rates are `null` when the trailing window holds fewer than `min_sample`
 * resolved events. That is "not measured yet", never a fabricated 0, and the
 * distinction is enforced all the way to the pixel.
 */
export interface Metrics {
  window_days: number
  min_sample: number
  phishing_click_rate: number | null
  report_rate: number | null
  simulation_sample: number
  avg_risk_score: number | null
  /** Moves only on what people DID when a threat reached them. The composite
   *  above also falls when training is merely completed, so this is the only
   *  one of the two an efficacy claim may rest on. */
  avg_behaviour_risk: number | null
  training_completion_rate: number | null
  training_sample: number
}

export interface TrendPoint {
  date: string
  phishing_click_rate: number | null
  report_rate: number | null
  avg_risk_score: number | null
  /** Moves only on what people DID when a threat reached them. The composite
   *  above also falls when training is merely completed, so this is the only
   *  one of the two an efficacy claim may rest on. */
  avg_behaviour_risk: number | null
  training_completion_rate: number | null
  /** 'measured' | 'seeded'. A point the demo seed drew and a point the loop
   *  measured are both floats; without this the executive page charted a
   *  hand-written curve under "measured from this deployment's own records"
   *  while a live tile above it told the opposite story about the same metric. */
  source?: string
}

export interface AnalystDashboard {
  metrics: Metrics
  trend: TrendPoint[]
  departments: DepartmentRisk[]
  active_runs: RunSummary[]
  recent_runs: RunSummary[]
  counts: {
    new_reports: number
    awaiting_approval: number
    active_simulations: number
    active_runs: number
    loops_closed: number
  }
  recent_events: {
    id: number
    employee_name: string
    type: string
    delta: number
    reason: string
    created_at: string
  }[]
}

export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  earned: boolean
  progress: number
}

export interface TeamStanding {
  department_id: number
  name: string
  avg_risk: number
  points: number
  is_mine: boolean
}

export interface EmployeeDashboard {
  employee: {
    id: number
    name: string
    department: string
    role_title: string
    risk_score: number
  }
  risk_breakdown: RiskFactor[]
  assignments: { pending: number; completed: number; avg_score: number | null }
  gamification: {
    points: number
    streak: number
    reports_submitted: number
    /** This person's position, and how many people are ranked. NO NAMES —
     *  a list of colleagues and their points is somebody else's business,
     *  and it was on this response for a while even though the portal never
     *  drew it. See `_standing` in routers/dashboard.py. */
    ranked_of: number
    rank: number | null
    badges: Badge[]
    team_leaderboard: TeamStanding[]
  }
}

export interface ExecutiveDashboard {
  metrics: Metrics
  trend: TrendPoint[]
  departments: DepartmentRisk[]
  loops_closed: number
  briefing: string
  /** Which engine wrote `briefing`: 'anthropic' | 'mock'. */
  briefing_source: string
}

/* ============================================================================
   Cyclowareness Sandbox
   ========================================================================== */

export type SandboxJobStatus =
  | 'queued'
  | 'running'
  | 'awaiting_password'
  | 'completed'
  | 'failed'

export interface SandboxSignal {
  id: string
  title: string
  severity: Severity
  detail: string
  evidence: Record<string, unknown>
  analyzer?: string
}

export interface AnalyzerResultView {
  analyzer: string
  /** False means the analyzer did not run — `unavailable_reason` says why. */
  ran: boolean
  unavailable_reason: string | null
  signals: SandboxSignal[]
  facts: Record<string, unknown>
  iocs: Record<string, string[]>
  duration_ms: number
}

/** The engine's classification of a sample.
 *
 * `verdict` is the answer; `threat_name` is the label an analyst quotes. The
 * detection panel is the engine's own internal detectors, not third parties —
 * `detection_ratio` is "3 / 6" of OUR checks, and the UI must never present it
 * as a multi-vendor score.
 */
export interface SandboxVerdict {
  verdict: 'malicious' | 'suspicious' | 'clean' | string
  threat_name: string | null
  detection_ratio: string
  detected: number
  total_engines: number
  platform: string | null
  category: string | null
  family: string | null
  engines?: { engine: string; detected: boolean; result: string; severity: string }[]
}

/** A demonstrated-impact rating, in the engine's own notation.
 *
 * Not CVSS, and it says so: `rating` names the notation and `disclaimer` states
 * what the number is and is not. `base_score` 0 at severity 'none' means
 * nothing was demonstrated — read `rationale`, never treat it as "no risk".
 */
export interface SandboxImpact {
  rating: string
  vector: string
  base_score: number
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical' | string
  metrics: Record<string, string>
  capabilities: string[]
  rationale: { metric: string; value: string; why: string }[]
  disclaimer: string
}

export interface MitreTechnique {
  technique_id: string
  name: string
  tactic: string
  evidence: string[]
}

/** What an off-host worker reported after detonating the sample.
 *
 * `ran: false` is not "nothing happened" — it means no detonation took place,
 * and `unavailable_reason` says why. `refused` is narrower still: the sandbox
 * declined this sample, which is a hole in the evidence the UI must show.
 */
export interface SandboxDynamicReport {
  engine?: string
  worker?: string
  ran?: boolean
  unavailable_reason?: string | null
  refused?: boolean
  timeline?: { t_ms: number; kind: string; detail: string }[]
  signals?: SandboxSignal[]
  facts?: Record<string, unknown>
  duration_ms?: number
}

export interface SandboxJobSummary {
  public_id: string
  source: 'upload' | 'url' | 'loop' | 'archive_member'
  original_name: string
  submitted_url: string | null
  sha256: string
  size_bytes: number
  mime: string
  family: string
  status: SandboxJobStatus
  stage: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  final_score: number
  /** Absent while the job is still running — it has not been classified yet.
   *
   *  Two shapes of absence, because two endpoints spell it differently: the
   *  queue sends `null`, the detail view normalises it to `{}`. Both mean "not
   *  classified", and `verdict` in it is the check that tells them apart from a
   *  real answer. Carried on the summary because it is the first thing anyone
   *  looks at, and a queue that shows a score without a verdict makes the
   *  reader guess. */
  verdict: SandboxVerdict | Record<string, never> | null
  created_at: string
  completed_at: string | null
}

export interface ScoreBreakdown {
  formula: string
  rule: {
    score: number
    signal_count: number
    bands: { severity: string; count: number; contribution: number; signals: string[] }[]
  }
  model: {
    score: number
    /** States plainly that the model is expert-weighted, not corpus-trained. */
    provenance: string
    features: Record<string, number>
    contributions: { feature: string; value: number; weight: number; contribution: number }[]
    bias: number
  }
  top_reasons: { id: string; title: string; severity: string; detail: string }[]
  tiers: Record<
    string,
    { ran: boolean; detail: string; unavailable_analyzers?: Record<string, string> }
  >
}

export interface SandboxJobDetail extends SandboxJobSummary {
  md5: string
  magic: string
  extension_mismatch: boolean
  error: string | null
  tiers: ScoreBreakdown['tiers']
  analysis: Record<string, AnalyzerResultView>
  iocs: Record<string, string[]>
  score_breakdown: ScoreBreakdown
  rule_score: number
  ai_score: number
  feedback: string | null
  archive_path: string | null
  duration_ms: number | null
  children: SandboxJobSummary[]
  /** `{}` while the job is still running; never null on a completed job. */
  verdict: SandboxVerdict | Record<string, never>
  impact: SandboxImpact | Record<string, never>
  mitre: MitreTechnique[]
  dynamic: SandboxDynamicReport
  /** Set when the awareness loop's ANALYZE stage raised this job. */
  loop_run_id: number | null
}

/** Counted in SQL over every job, not over the page the client happens to hold.
 *  A tile computed from one page is a property of the page, not of the estate. */
export interface SandboxJobStats {
  total: number
  completed: number
  in_flight: number
  /** Always carries all four keys, so the UI never has to distinguish "none"
   *  from "not reported". They sum to `completed`. */
  verdicts: { malicious: number; suspicious: number; clean: number; unclassified: number }
  needs_attention: number
  average_score: number
  families: { family: string; count: number }[]
  top_risk: SandboxJobSummary[]
}

export interface SandboxCapabilities {
  static_analyzers: string[]
  unavailable_analyzers: Record<string, string>
  yara: { loaded: number; files?: number; failed?: Record<string, string> | null; error?: string }
  /** Dynamic detonation runs off-host; false here is the honest default. */
  dynamic_worker: boolean
  /** Why no worker is attached. Present exactly when `dynamic_worker` is false,
   *  so the UI can say what is missing instead of showing a bare "no". */
  dynamic_unavailable_reason: string | null
  supported_extensions: string[]
}

/* ============================================================================
   Approvals — the human gate as a queue
   ========================================================================== */

export type ApprovalDecision = 'approve' | 'reject' | 'request_revision'

export interface ApprovalQueueItem {
  run_id: number
  threat_id: number | null
  threat_title: string
  threat_source: string | null
  threat_type: string | null
  verdict: string | null
  severity: Severity | null
  module_id: number | null
  module_title: string | null
  /** 'anthropic' | 'mock' | '' — never inferred. */
  generation_source: string
  proposed_targets: number
  waiting_since: string
  waiting_seconds: number
  assigned_analyst: string | null
  sanitization_status?: string
}

/**
 * The approval workspace payload — mirrors `/api/approvals/{run_id}` exactly.
 *
 * Note what is NOT here: the full LoopRunDetail and a sandbox job. The endpoint
 * composes only what a reviewer needs on one screen, and inventing the rest here
 * is how a page ends up reading `undefined` off a field the server never sent.
 */
export interface ApprovalDetail {
  run_id: number
  run_status: LoopStatus
  awaiting_approval: boolean
  created_at: string
  waiting_seconds: number
  severity: Severity | null
  /** How the severity was arrived at — shown so it is not read as measured. */
  severity_basis: string | null
  threat: Threat | null
  /** Sanitised excerpt of the artifact; never the live payload. */
  artifact_excerpt: string | null
  artifact_excerpt_truncated: boolean
  analysis: Record<string, unknown> | null
  analysis_note: string | null
  module: TrainingModule | null
  /** Human-readable engine label for the module's provenance. */
  generation_label: string | null
  proposed_targets: Target[]
  targeting_note: string | null
  safety: {
    sanitized?: boolean
    checks?: { name: string; passed: boolean; detail: string }[]
    [key: string]: unknown
  } | null
  second_approval: Record<string, unknown> | null
}

export interface ApprovalHistoryEntry {
  at: string
  actor: string
  decision: ApprovalDecision | 'comment'
  comment: string
}

/* ============================================================================
   Policy Intelligence
   ========================================================================== */

export type PolicyType =
  | 'security_policy'
  | 'whitelist'
  | 'approved_software'
  | 'baseline'
  | 'exception_register'
  | 'access_policy'
  | 'incident_procedure'
  | 'vendor_requirement'
  | 'control_document'

export type PolicyStatus = 'draft' | 'active' | 'under_review' | 'superseded' | 'retired'
export type ExtractionStatus = 'pending' | 'extracted' | 'failed' | 'not_attempted'
export type RuleStatus = 'proposed' | 'active' | 'rejected' | 'superseded'

export interface PolicyRule {
  id: number
  policy_id: number
  rule_key: string
  statement: string
  rule_type: 'allow' | 'deny' | 'require' | 'version_floor' | 'version_ceiling' | 'exception' | 'control'
  technology: string | null
  version_spec: string | null
  /** The passage it came from. This is what makes a rule checkable by a human. */
  evidence_quote: string | null
  evidence_location: string | null
  confidence: number | null
  status: RuleStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Policy {
  id: number
  name: string
  policy_type: PolicyType
  version: string
  status: PolicyStatus
  owner_name: string | null
  owner_email: string | null
  effective_date: string | null
  review_date: string | null
  applicable_departments: (string | number)[]
  source_filename: string | null
  source_mime: string | null
  source_bytes: number | null
  uploaded_by: string | null
  extraction_status: ExtractionStatus
  extraction_error: string | null
  /** '' | 'manual' | 'mock' | 'anthropic' — never inferred. */
  extraction_source: string
  notes: string | null
  created_at: string
  updated_at: string | null
  rule_count?: number
  open_findings?: number
}

export interface PolicyVersion {
  id: number
  policy_id: number
  version: string
  changed_by: string | null
  change_summary: string | null
  diff: Record<string, unknown> | null
  created_at: string
}

export interface PolicyDetail extends Policy {
  rules: PolicyRule[]
  versions: PolicyVersion[]
  findings: PolicyFinding[]
}

export type FindingType =
  | 'outdated_approved_version'
  | 'unsafe_whitelist_entry'
  | 'vulnerable_allowed_version'
  | 'expired_exception'
  | 'policy_conflict'
  | 'missing_control'
  | 'external_advisory_match'
  | 'exposure_match'

export type FindingStatus =
  | 'open'
  | 'in_review'
  | 'remediation_planned'
  | 'training_assigned'
  | 'resolved'
  | 'accepted_risk'
  | 'false_positive'

export interface PolicyFinding {
  id: number
  finding_type: FindingType
  title: string
  description: string
  severity: Severity
  confidence: number | null
  status: FindingStatus
  policy_id: number | null
  policy_name?: string | null
  policy_rule_id: number | null
  technology: string | null
  affected_version: string | null
  approved_version: string | null
  recommended_version: string | null
  source: string | null
  source_ref: string | null
  published_at: string | null
  detected_at: string
  affected_department_ids: number[]
  affected_employee_ids: number[]
  suggested_remediation: string | null
  required_training: string | null
  owner_name: string | null
  due_date: string | null
  evidence: { label: string; value: string; ref?: string }[]
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

/* ============================================================================
   Threat Intelligence
   ========================================================================== */

export type IntelSource =
  | 'nvd'
  | 'cisa'
  | 'cert'
  | 'vendor'
  | 'research'
  | 'osint'
  | 'breach_monitor'
  | 'feed'

export type IntelType =
  | 'vulnerability'
  | 'advisory'
  | 'campaign'
  | 'ransomware'
  | 'credential_exposure'
  | 'ioc'
  | 'research'

export type IntelRelevance =
  | 'unassessed'
  | 'not_applicable'
  | 'monitoring'
  | 'relevant'
  | 'urgent'

export interface IntelItem {
  id: number
  external_id: string | null
  source: IntelSource
  source_name: string | null
  source_url: string | null
  title: string
  summary: string
  intel_type: IntelType
  severity: Severity
  cvss_score: number | null
  cvss_vector: string | null
  published_at: string | null
  fetched_at: string | null
  affected_products: { vendor?: string; product?: string; versions?: string }[]
  mitre_techniques: string[]
  iocs: Record<string, string[]>
  reference_urls: string[]
  relevance: IntelRelevance
  relevance_reason: string | null
  dismissed_by: string | null
  dismissed_reason: string | null
  created_at: string
  match_count?: number
}

export interface IntelMatch {
  id: number
  intel_item_id: number
  match_type:
    | 'approved_software'
    | 'policy_rule'
    | 'technology_in_use'
    | 'department_exposure'
    | 'credential_domain'
  matched_policy_id: number | null
  matched_rule_id: number | null
  matched_technology: string | null
  matched_version: string | null
  confidence: number | null
  /** A sentence a human can check. Without it, a match is an assertion. */
  explanation: string
  affected_department_ids: number[]
  affected_employee_ids: number[]
  created_finding_id: number | null
  created_at: string
}

export interface IntelItemDetail extends IntelItem {
  matches: IntelMatch[]
  findings: PolicyFinding[]
}

/** `/api/intel/refresh` — honest about what is actually wired. */
export interface IntelRefreshResult {
  configured_sources: string[]
  checked: number
  new_items: number
  message: string
}

/* ============================================================================
   Incident Risks
   ========================================================================== */

export type IncidentRiskType =
  | 'user_action'
  | 'privileged_exposure'
  | 'data_mishandling'
  | 'procedure_failure'
  | 'alert_fatigue'
  | 'knowledge_gap'

export type Confidentiality = 'public' | 'internal' | 'restricted' | 'secret'

export type IncidentRiskStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_review'
  | 'closed'
  | 'reopened'

export interface IncidentRiskSubject {
  id: number
  incident_risk_id: number
  employee_id: number
  employee_name?: string
  assignment_id: number | null
  sandbox_job_id: number | null
  status: 'assigned' | 'in_progress' | 'completed' | 'reviewed' | 'failed' | 'waived'
  score: number | null
  completed_at: string | null
  reviewer_decision: 'pending' | 'accepted' | 'rejected'
  reviewer_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface IncidentRisk {
  id: number
  title: string
  incident_ref: string | null
  risk_type: IncidentRiskType
  severity: Severity
  description: string
  /** Drives redaction in the employee view. */
  confidentiality: Confidentiality
  status: IncidentRiskStatus
  affected_department_id: number | null
  evidence: { label: string; value: string; ref?: string }[]
  required_action: string | null
  requires_training: boolean
  requires_quiz: boolean
  requires_sandbox: boolean
  min_score: number | null
  deadline: string | null
  approver_name: string | null
  closure_criteria: string | null
  created_by: string | null
  created_at: string
  closed_at: string | null
  closure_note: string | null
  reopened_count: number
  subject_count?: number
}

export interface IncidentRiskDetail extends IncidentRisk {
  subjects: IncidentRiskSubject[]
  timeline: { at: string; actor: string; action: string; summary: string }[]
}

/** The employee's own view — redacted by confidentiality. */
/** One obligation charged to the signed-in employee.
 *
 * THESE ARE THE SERVER'S FIELD NAMES, not a tidier set. The previous shape
 * declared `subject_id`, `incident_risk_id`, `what_happened`, `why_assigned`,
 * `assignment_id`, `redaction_reason` and `created_at` — the server sends none
 * of them. What the employee saw: "Raised —", the generic redaction sentence
 * instead of the one naming who to ask, and an "Open the training" button
 * pointing at `/portal/training/undefined`.
 *
 * Note the two statuses. `status` is the INVESTIGATION's lifecycle; `my_status`
 * is this person's own progress. Rendering the first as though it were the
 * second told someone who had finished that they were still assigned.
 */
export interface MyIncidentRisk {
  id: number
  title: string
  severity: Severity
  /** The investigation's state — not the employee's. */
  status: string
  /** THIS person's progress against their obligation. */
  my_status: IncidentRiskSubject['status']
  my_score: number | null
  my_completed_at: string | null
  /** Withheld when `redacted`; `redaction_note` names who can explain it. */
  description: string | null
  evidence: string[] | null
  redacted: boolean
  redaction_note: string | null
  required_action: string | null
  deadline: string | null
  min_score: number | null
  requires_training: boolean
  requires_quiz: boolean
  requires_sandbox: boolean
  /** Who signed the obligation off, so the employee knows who to ask. */
  approver_name: string | null
}

/* ============================================================================
   Remediation
   ========================================================================== */

export type RemediationStatus = 'proposed' | 'approved' | 'rejected' | 'blocked' | 'delivered'
export type RemediationSource = 'internal' | 'external' | 'generated' | 'none'

export interface RemediationPlan {
  id: number
  trigger_kind: string
  trigger_ref: string
  employee_id: number
  employee_name: string | null
  status: RemediationStatus
  source_kind: RemediationSource
  asset_id: number | null
  framing: {
    headline?: string
    why_you?: string
    what_to_do?: string[]
    takeaway?: string
  }
  assessment: Record<string, unknown>
  decision: {
    selected_candidate?: string | null
    source_kind?: string
    rationale?: string
    runner_up?: string | null
    rejected?: { candidate: string; why: string }[]
  }
  urgency: 'routine' | 'prompt' | 'immediate' | string
  /** FALSE means no model was involved — retrieval alone chose this. The UI must
   *  say so rather than letting a library match read as AI. */
  ai_ran: boolean
  /** Why nothing was attached. Populated for every outcome that is not a
   *  delivered plan, empty otherwise. */
  not_attached_reason: string
  /** Every clamp the output firewall applied, and the rule that applied it. */
  validator_adjustments: { rule: string; field: string; was: string; now: string }[]
  /** Set when the firewall REFUSED. This is the security metric — a spike in one
   *  code means somebody is probing what the product will write. */
  rejection_code: string
  confidence: number | null
  manager_visible: boolean
  learner_disclosure: string
  /** The right of appeal the disclosure promises. `disputed_at` set with an
   *  empty `dispute_resolution` is an OPEN dispute: a person waiting on a human. */
  disputed_at: string | null
  dispute_note: string
  dispute_resolution: string
  dispute_resolved_by: string
  dispute_resolved_at: string | null
  approved_by: string
  approved_at: string | null
  created_at: string
}

/** Open means somebody contested a decision and no human has answered yet. */
export function disputeState(plan: RemediationPlan): 'none' | 'open' | 'resolved' {
  if (!plan.disputed_at) return 'none'
  return plan.dispute_resolution ? 'resolved' : 'open'
}

/** Nothing in the catalogue covered this behaviour. A RESULT, not a failure —
 *  accumulated, these are the content roadmap. */
export interface RemediationCoverageGap {
  id: number
  behaviour: string
  trigger_kind: string
  detail: string
  times_hit: number
  first_seen_at: string
  last_seen_at: string
}

/** The person is not the vulnerability here; the control is missing. */
export interface RemediationControlGap {
  id: number
  trigger_kind: string
  trigger_ref: string
  recommended_control: string
  rationale: string
  department_id: number | null
  status: string
  created_at: string
}

export interface RemediationStats {
  total: number
  by_status: Record<string, number>
  /** Counted per firewall rejection code. */
  rejections_by_code: Record<string, number>
  built_with_a_model: number
  built_from_the_library: number
  coverage_gaps: number
  control_gaps: number
  /** People waiting on a human to answer an appeal. The one number here that
   *  should stay at zero because it was worked, not because nobody can file. */
  disputes_open: number
  disputes_total: number
}

/* ============================================================================
   Integrations
   ========================================================================== */

export type IntegrationProvider =
  | 'udemy_business'
  | 'moodle'
  | 'cornerstone'
  | 'sap_successfactors'
  | 'viva_learning'
  | 'scorm'
  | 'xapi'
  | 'lti'
  | 'custom_lms'
  | 'sso_saml'
  | 'sso_oidc'

export type IntegrationStatus =
  | 'not_configured'
  | 'configured'
  | 'connected'
  | 'degraded'
  | 'error'
  | 'disabled'

export interface Integration {
  id: number
  provider: IntegrationProvider
  display_name: string
  status: IntegrationStatus
  capabilities: string[]
  /** Never secrets — only the non-sensitive shape (base url, account name). */
  config_summary: Record<string, unknown>
  last_sync_at: string | null
  last_sync_status: 'never' | 'ok' | 'partial' | 'failed'
  last_sync_error: string | null
  courses_imported: number
  created_at: string
  updated_at: string | null
}

export interface ExternalCourse {
  id: number
  integration_id: number
  external_ref: string
  title: string
  description: string | null
  provider_name: string | null
  url: string | null
  duration_minutes: number | null
  language: string | null
  topics: string[]
  mapped_behaviors: string[]
  last_synced_at: string | null
  active: boolean
}

/* ============================================================================
   Audit
   ========================================================================== */

export interface AuditEvent {
  id: number
  actor_email: string | null
  actor_role: string | null
  action: string
  object_type: string | null
  object_id: string | null
  object_label: string | null
  summary: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  at: string
}

export interface AuditPage {
  events: AuditEvent[]
  truncated: boolean
  total?: number
}

/* ============================================================================
   Provenance — how any piece of content came to exist
   ========================================================================== */

export type Provenance =
  | 'ai_generated'
  | 'ai_assisted'
  | 'analyst_edited'
  | 'human_approved'
  | 'template'
  | 'imported_lms'
  | 'unknown'

/**
 * Maps the backend's `generation_source` onto the provenance vocabulary the UI
 * speaks. An empty source is human-authored, not "unknown AI" — the distinction
 * is the entire point of the field.
 */
export function provenanceOf(
  generationSource: string | null | undefined,
  opts: { approved?: boolean; edited?: boolean } = {},
): Provenance {
  if (opts.edited) return 'analyst_edited'
  if (generationSource === 'anthropic') return opts.approved ? 'human_approved' : 'ai_generated'
  if (generationSource === 'mock') return 'template'
  if (generationSource === '') return opts.approved ? 'human_approved' : 'analyst_edited'
  return 'unknown'
}

/* ============================================================================
   Pagination envelope
   ========================================================================== */

/**
 * The list shape the newer routers return.
 *
 * It carries `truncated` on purpose: a list that was capped must be able to say
 * so, because "these are the findings" and "these are the first 50 findings"
 * are different claims and a governance surface may not blur them.
 */
export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  truncated: boolean
  /** Present when the server wants to explain the cap or the filter in words. */
  note?: string | null
}

/** Accepts either shape, so a route that changes does not break a caller. */
export function itemsOf<T>(payload: Paginated<T> | T[] | undefined | null): T[] {
  if (!payload) return []
  return Array.isArray(payload) ? payload : payload.items
}

export function isTruncated<T>(payload: Paginated<T> | T[] | undefined | null): boolean {
  return !!payload && !Array.isArray(payload) && payload.truncated
}

export function totalOf<T>(payload: Paginated<T> | T[] | undefined | null): number {
  if (!payload) return 0
  return Array.isArray(payload) ? payload.length : payload.total
}
