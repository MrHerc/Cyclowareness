/**
 * Everything the executive view is allowed to claim, derived in one place.
 *
 * `/api/dashboard/executive` returns four things: the current windowed metrics,
 * a series of daily snapshots, a current roll-up per department, and a count of
 * closed loops. That is the whole budget. Every function here spends only from
 * it (plus the two governance lists the page fetches alongside), and every one
 * of them returns `null` rather than inventing the figure a slide would prefer.
 *
 * Two derivations are worth naming, because both are places a dashboard usually
 * cheats:
 *
 * **The previous period comes from a snapshot, not from arithmetic.** Each
 * snapshot stores the trailing-window rate as it stood on its own date, so the
 * snapshot one window back is a genuinely non-overlapping earlier period. When
 * no snapshot exists there, the comparison is returned invalid with the reason —
 * never as a flat line through the gap.
 *
 * **Per-department movement is absent on purpose.** The endpoint carries no
 * per-department history, so nothing here produces one. What departments can
 * honestly be ranked by is their standing today, and the functions that do that
 * say `standing` in their names so no caller mistakes it for improvement.
 */

import type { MetricComparison } from '../../components/data'
import { toISODate } from '../../components/data'
import type { SeverityCount } from '../../components/charts'
import type {
  DepartmentRisk,
  IncidentRisk,
  Metrics,
  PolicyFinding,
  RunSummary,
  Severity,
  TrendPoint,
} from '../../domain/types'
import { isOpenFinding } from '../policy/data'
import { formatDate, pct, riskBand } from '../../lib/format'

/* ============================================================================
   The trend series
   ========================================================================== */

/** The four series a snapshot actually stores. Nothing else is chartable. */
export type TrendKey =
  | 'phishing_click_rate'
  | 'report_rate'
  | 'avg_risk_score'
  | 'training_completion_rate'

/** Snapshot dates are `YYYY-MM-DD`, so a string comparison is a date comparison. */
export function clipTrend(points: TrendPoint[], from: string, to: string): TrendPoint[] {
  return points.filter((point) => point.date >= from && point.date <= to)
}

/** How many days in a slice carry a real value for a series. */
export function measuredDays(points: TrendPoint[], key: TrendKey): number {
  return points.reduce((total, point) => total + (point[key] === null ? 0 : 1), 0)
}

function shiftDays(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return toISODate(date)
}

/**
 * The same measurement, one window earlier.
 *
 * Accepts a snapshot between one and two windows back, and labels the delta with
 * that snapshot's real date — "vs 30 days ago" over a 46-day-old reading is the
 * kind of caption that survives into a board pack unchallenged.
 */
export function previousPeriod(
  points: TrendPoint[] | undefined,
  key: TrendKey,
  windowDays: number | undefined,
  improvement: 'up' | 'down',
): MetricComparison {
  if (!points || points.length === 0 || !windowDays) {
    return { previous: null, valid: false, reason: 'the snapshot series has not loaded' }
  }

  const newest = shiftDays(windowDays)
  const oldest = shiftDays(windowDays * 2)
  const candidates = points
    .filter((point) => point[key] !== null && point.date >= oldest && point.date <= newest)
    .sort((a, b) => a.date.localeCompare(b.date))

  const baseline = candidates[candidates.length - 1]
  if (!baseline) {
    return {
      previous: null,
      valid: false,
      reason: `nothing was measured between ${formatDate(oldest)} and ${formatDate(newest)}`,
    }
  }

  return {
    previous: baseline[key],
    valid: true,
    label: `vs ${formatDate(baseline.date)}`,
    improvement,
  }
}

/* ============================================================================
   Departments — standing only. There is no per-department history to difference.
   ========================================================================== */

export interface DepartmentStanding {
  /** Elevated or high average, or carrying anyone in the high-risk band. */
  attention: DepartmentRisk[]
  /** Currently in the low band. Standing today, not improvement over time. */
  strongest: DepartmentRisk[]
}

export function departmentStanding(departments: DepartmentRisk[], take = 3): DepartmentStanding {
  const scored = departments.filter((department) => department.employee_count > 0)
  return {
    attention: scored
      .filter((d) => riskBand(d.avg_risk) !== 'low' || d.high_risk_count > 0)
      .sort((a, b) => b.avg_risk - a.avg_risk || b.high_risk_count - a.high_risk_count)
      .slice(0, take),
    strongest: scored
      .filter((d) => riskBand(d.avg_risk) === 'low' && d.high_risk_count === 0)
      .sort((a, b) => a.avg_risk - b.avg_risk)
      .slice(0, take),
  }
}

/** People on a scored roster — the denominator behind the organisation average. */
export function scoredHeadcount(departments: DepartmentRisk[]): number {
  return departments.reduce((total, department) => total + department.employee_count, 0)
}

/* ============================================================================
   Policy exposure
   ========================================================================== */

const HIGH_SEVERITIES: readonly Severity[] = ['critical', 'high']

export function openFindingsOf(findings: PolicyFinding[]): PolicyFinding[] {
  return findings.filter(isOpenFinding)
}

export function highSeverityCount(findings: PolicyFinding[]): number {
  return findings.filter((finding) => HIGH_SEVERITIES.includes(finding.severity)).length
}

export function severityCounts(findings: PolicyFinding[]): SeverityCount[] {
  const tally = new Map<Severity, number>()
  for (const finding of findings) {
    tally.set(finding.severity, (tally.get(finding.severity) ?? 0) + 1)
  }
  return [...tally].map(([severity, count]) => ({ severity, count }))
}

export interface PolicyExposure {
  /** Distinct people named by at least one open finding. */
  people: number
  /** Distinct departments named by at least one open finding. */
  departments: number
  /** Open findings that name neither a person nor a department. */
  unscoped: number
}

/**
 * Who an open finding actually lands on.
 *
 * A finding that names a department but no individuals contributes to the
 * department count and nothing to the head count, so `people` is a floor rather
 * than a total. The metric tile says so.
 */
export function policyExposure(open: PolicyFinding[]): PolicyExposure {
  const people = new Set<number>()
  const departments = new Set<number>()
  let unscoped = 0

  for (const finding of open) {
    const employees = finding.affected_employee_ids ?? []
    const depts = finding.affected_department_ids ?? []
    employees.forEach((id) => people.add(id))
    depts.forEach((id) => departments.add(id))
    if (employees.length === 0 && depts.length === 0) unscoped += 1
  }

  return { people: people.size, departments: departments.size, unscoped }
}

/** Open findings whose remediation date has already passed. */
export function overdueCount(open: PolicyFinding[]): number {
  const today = toISODate(new Date())
  return open.filter((finding) => !!finding.due_date && finding.due_date.slice(0, 10) < today).length
}

/* ============================================================================
   Incident-response remediation
   ========================================================================== */

export interface RemediationProgress {
  closed: number
  total: number
  /** `null` below the platform's minimum sample — a share of three is not a rate. */
  rate: number | null
}

export function remediationProgress(risks: IncidentRisk[], minSample: number): RemediationProgress {
  const total = risks.length
  const closed = risks.filter((risk) => risk.status === 'closed').length
  return { closed, total, rate: total >= Math.max(1, minSample) ? closed / total : null }
}

export function openIncidentCount(risks: IncidentRisk[]): number {
  return risks.filter((risk) => risk.status !== 'closed').length
}

/* ============================================================================
   The loop
   ========================================================================== */

export interface LoopOutcomes {
  completed: number
  awaiting: number
  failed: number
}

export function loopOutcomes(runs: RunSummary[]): LoopOutcomes {
  let completed = 0
  let failed = 0
  let awaiting = 0
  for (const run of runs) {
    if (run.status === 'completed') completed += 1
    else if (run.status === 'failed') failed += 1
    else awaiting += 1
  }
  return { completed, awaiting, failed }
}

/**
 * The real threats that put somebody into training.
 *
 * Targeting is stage 4 and runs only after a person approves the module, so a
 * run with targets is a run that reached people. Runs with no targets are left
 * out rather than listed at zero: they are threats that were analysed and
 * closed, which is a different claim.
 */
export function trainingDrivers(runs: RunSummary[], take = 6): RunSummary[] {
  return runs
    .filter((run) => run.targets > 0)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, take)
}

/* ============================================================================
   Recommendations — generated from the figures above, never measured
   ========================================================================== */

export interface Recommendation {
  id: string
  /** One sentence, in the imperative or the indicative. Never a slogan. */
  headline: string
  /** The figure the sentence came from, so a reader can check it on this page. */
  evidence: string
}

export interface RecommendationInput {
  metrics: Metrics | undefined
  departments: DepartmentRisk[]
  loopsClosed: number | null
  /** Open findings, or `null` when the list could not be read. */
  openFindings: PolicyFinding[] | null
  /** All incident risks, or `null` when the role may not read them. */
  incidentRisks: IncidentRisk[] | null
}

/**
 * A fixed rule set over the numbers on screen.
 *
 * No model is involved and none is claimed. Each item carries the figure that
 * produced it so the reader can disagree with the rule rather than with an
 * unattributable assertion, and the section header says these are generated.
 */
export function recommendations(input: RecommendationInput, take = 5): Recommendation[] {
  const { metrics, departments, loopsClosed, openFindings, incidentRisks } = input
  const out: Recommendation[] = []

  const click = metrics?.phishing_click_rate ?? null
  const report = metrics?.report_rate ?? null
  const window = metrics?.window_days ?? 0
  const simulationSample = metrics?.simulation_sample ?? 0

  if (click !== null && report !== null && click >= report) {
    out.push({
      id: 'reporting-lag',
      headline:
        'Lures are still converting at least as often as they are reported. Put the next cycle into reporting drills rather than more content.',
      evidence: `Click ${pct(click)} against report ${pct(report)} over ${simulationSample} resolved simulation outcomes in ${window} days.`,
    })
  }

  const worst = [...departments]
    .filter((department) => department.employee_count > 0)
    .sort((a, b) => b.avg_risk - a.avg_risk)[0]
  if (worst && riskBand(worst.avg_risk) === 'high') {
    out.push({
      id: 'weakest-department',
      headline: `${worst.name} carries the highest average risk in the organisation. Target the next loop there.`,
      evidence: `Average score ${worst.avg_risk.toFixed(1)} across ${worst.employee_count} people, ${worst.high_risk_count} of them in the high-risk band.`,
    })
  }

  if (openFindings) {
    const severe = highSeverityCount(openFindings)
    if (severe > 0) {
      out.push({
        id: 'severe-findings',
        headline:
          'Resolve or formally accept the open policy findings at high or critical severity. An open finding is an unowned decision.',
        evidence: `${severe} of ${openFindings.length} open findings are high or critical.`,
      })
    }
    const overdue = overdueCount(openFindings)
    if (overdue > 0) {
      out.push({
        id: 'overdue-findings',
        headline: 'Findings past their remediation date need a new date or a written acceptance.',
        evidence: `${overdue} open finding${overdue === 1 ? '' : 's'} passed the recorded due date.`,
      })
    }
  }

  const completion = metrics?.training_completion_rate ?? null
  if (completion !== null && completion < 0.8) {
    out.push({
      id: 'completion',
      headline:
        'Assigned training is not being finished. Completion is attendance, so this is the floor under every behaviour figure above.',
      evidence: `${pct(completion)} completion across ${metrics?.training_sample ?? 0} assignments in ${window} days.`,
    })
  }

  if (click === null) {
    out.push({
      id: 'no-behaviour-evidence',
      headline:
        'No behaviour claim can be evidenced this period. Run a simulation so the next report has a measured click rate behind it.',
      evidence: `${simulationSample} resolved outcomes in ${window} days, below the ${metrics?.min_sample ?? 5} needed to report a rate.`,
    })
  }

  if (loopsClosed === 0) {
    out.push({
      id: 'no-closed-loops',
      headline:
        'No loop has reached measurement yet. Until one does, the platform is reporting inputs rather than outcomes.',
      evidence: 'Zero runs have completed all seven stages and produced a measurement.',
    })
  }

  if (incidentRisks) {
    const open = openIncidentCount(incidentRisks)
    if (open > 0) {
      out.push({
        id: 'open-incident-risks',
        headline: 'Incident-response risks are still open against named people.',
        evidence: `${open} of ${incidentRisks.length} incident risks have not been closed.`,
      })
    }
  }

  return out.slice(0, take)
}
