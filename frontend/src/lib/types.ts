// Shared API types (mirror backend/app/schemas.py)

export type RoleName = 'analyst' | 'employee' | 'executive'

export interface Session {
  access_token: string
  role: RoleName
  email: string
  employee_id: number | null
  employee_name: string | null
}

export interface StageEntry {
  stage: number
  name: string
  status: 'in_progress' | 'completed' | 'failed'
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
}

export interface LoopRun {
  id: number
  trigger_threat_id: number
  current_stage: number
  status: 'running' | 'awaiting_approval' | 'awaiting_training' | 'completed' | 'failed'
  stage_history: StageEntry[]
  training_module_id: number | null
  report_id: number | null
  targeting: Target[]
  measure_summary: MeasureSummary | null
  created_at: string
  completed_at: string | null
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

export interface Threat {
  id: number
  source: 'human_sensor' | 'feed' | 'manual'
  artifact_type: string
  artifact_ref: string
  artifact_meta: Record<string, unknown>
  title: string
  verdict: 'malicious' | 'suspicious' | 'benign' | null
  confidence: number | null
  threat_type: string | null
  iocs: { urls?: string[]; domains?: string[]; hashes?: string[]; sender_patterns?: string[] } | null
  behavior_summary: string | null
  explanation: string | null
  reported_by_employee_id: number | null
  created_at: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_index: number
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
  status: 'pending_review' | 'approved' | 'rejected'
  approved_by: string | null
  created_at: string
}

export interface Assignment {
  id: number
  module_id: number
  employee_id: number
  loop_run_id: number | null
  status: 'assigned' | 'in_progress' | 'completed' | 'expired'
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
  per_question: { index: number; correct: boolean; correct_index: number; explanation: string }[]
  risk_delta: number
  new_risk_score: number
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

export interface Employee {
  id: number
  name: string
  email: string
  department_id: number
  role_title: string
  role_sensitivity: number
  current_risk_score: number
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

export interface Report {
  id: number
  employee_id: number
  artifact_type: string
  artifact_ref: string
  artifact_meta: Record<string, unknown>
  note: string
  status: 'new' | 'in_loop' | 'dismissed'
  triage_summary: {
    summary: string
    suspicion_level: 'high' | 'medium' | 'low'
    indicators: string[]
    likely_iocs: { urls?: string[]; domains?: string[]; sender_patterns?: string[] }
    recommended_action: string
  } | null
  linked_threat_id: number | null
  linked_loop_run_id: number | null
  created_at: string
  employee_name?: string
  department_name?: string
}

export interface Simulation {
  id: number
  name: string
  template_threat_id: number | null
  channel: string
  status: 'draft' | 'active' | 'completed'
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
    outcome: 'pending' | 'clicked' | 'reported' | 'ignored'
    outcome_at: string | null
  }[]
  stats: {
    targets: number
    resolved: number
    clicked: number
    reported: number
    click_rate: number | null
    report_rate: number | null
  }
}

export interface FeedItem {
  id: number
  title: string
  summary: string
  threat_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source_name: string
  published_at: string
  iocs: Record<string, string[]>
  artifact_example: string
  artifact_type: string
  pushed_to_loop: boolean
}

export interface Metrics {
  phishing_click_rate: number
  report_rate: number
  avg_risk_score: number
  training_completion_rate: number
}

export interface TrendPoint {
  date: string
  phishing_click_rate: number
  report_rate: number
  avg_risk_score: number
  training_completion_rate: number
}

export interface RunSummary {
  id: number
  status: LoopRun['status']
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
    leaderboard: { employee_id: number; name: string; points: number }[]
    rank: number | null
  }
}

export interface ExecutiveDashboard {
  metrics: Metrics
  trend: TrendPoint[]
  departments: DepartmentRisk[]
  loops_closed: number
  briefing: string
}

export const STAGES = [
  { n: 1, key: 'ingest', label: 'Ingest', hint: 'Human sensor + threat feed' },
  { n: 2, key: 'analyze', label: 'Analyze', hint: 'Sandbox verdict + IOCs' },
  { n: 3, key: 'convert', label: 'Convert', hint: 'AI: threat → training' },
  { n: 4, key: 'target', label: 'Target', hint: 'Map to at-risk people' },
  { n: 5, key: 'train', label: 'Train', hint: 'Adaptive micro-training' },
  { n: 6, key: 'measure', label: 'Measure', hint: 'Risk score + behavior Δ' },
  { n: 7, key: 'feedback', label: 'Feedback', hint: 'Results update the model' },
] as const
