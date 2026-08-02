/**
 * The arithmetic the Command Center does on its way from endpoints to pixels.
 *
 * It lives here rather than in the page so that every derived number has one
 * definition. Two of them are load-bearing:
 *
 *   - `positionOf` decides which stage node a run is counted under, and it does
 *     so by calling the frozen `summariseRuns` on a single run rather than by
 *     re-deriving the rules. A run awaiting training sits at Training, not at
 *     `current_stage`; a failed run sits where it died. If this file restated
 *     those rules the stage filter would eventually disagree with the number
 *     printed on the node it was clicked from, which is the one bug a filter
 *     built on a visual must not have.
 *
 *   - `systemWarnings` composes only from facts the API actually reports. There
 *     is no heuristic here and no severity invented for effect: a missing model
 *     is a capability statement, an integration in `error` is a status the
 *     server sent. Nothing is warned about because it would look impressive.
 */

import { SEVERITY_ORDER, type SeverityCount } from '../../components/charts'
import { summariseRuns } from '../../components/loop'
import type { QueueRow } from '../approvals/contract'
import type {
  Capabilities,
  Integration,
  PolicyFinding,
  RunSummary,
  SandboxCapabilities,
  Severity,
} from '../../domain/types'

/* ============================================================================
   Runs
   ========================================================================== */

/**
 * The dashboard sends `active_runs` and `recent_runs` as separate lists and a
 * run can legitimately appear in both. Counting it twice would inflate every
 * stage node, so identity wins over list membership.
 */
export function combineRuns(
  active: readonly RunSummary[] | undefined,
  recent: readonly RunSummary[] | undefined,
): RunSummary[] {
  const byId = new Map<number, RunSummary>()
  for (const run of [...(active ?? []), ...(recent ?? [])]) {
    if (!byId.has(run.id)) byId.set(run.id, run)
  }
  return [...byId.values()]
}

/** Where a run is held right now. `null` means it holds no position at all. */
export type RunPosition = number | 'gate' | null

/**
 * The single stage (or the gate) a run occupies, exactly as the flow figure
 * counts it. A completed run occupies nothing — it is throughput, not a queue.
 */
export function positionOf(run: RunSummary): RunPosition {
  const { stages, gate } = summariseRuns([run])
  if (gate.waiting > 0) return 'gate'
  const held = stages.find(
    (stage) => stage.counts.active + stage.counts.waiting + stage.counts.failed > 0,
  )
  return held ? held.stage : null
}

/** Filters a run list to one node of the flow. A `null` filter is "everything". */
export function runsAt(runs: readonly RunSummary[], position: RunPosition): RunSummary[] {
  if (position === null) return [...runs]
  return runs.filter((run) => positionOf(run) === position)
}

/** Parses the `stage` search param back into a position. Unknown values are dropped. */
export function parsePosition(raw: string | null): RunPosition {
  if (raw === null || raw === '') return null
  if (raw === 'gate') return 'gate'
  const stage = Number(raw)
  return Number.isInteger(stage) && stage >= 1 && stage <= 7 ? stage : null
}

/* ============================================================================
   The approval queue
   ========================================================================== */

/** Longest wait first. The thing that has waited longest is the thing to do next. */
export function sortByWait(queue: readonly QueueRow[]): QueueRow[] {
  return [...queue].sort((a, b) => b.waitingSeconds - a.waitingSeconds)
}

/**
 * The items this analyst is named on.
 *
 * `assigned_analyst` is a free-text field the server fills from either an email
 * or a display name, so both are compared. An unassigned item belongs to
 * nobody and is deliberately not swept into "mine" — claiming work the server
 * did not assign would make the count meaningless.
 */
export function assignedTo(
  queue: readonly QueueRow[],
  actor: { email?: string | null; name?: string | null },
): QueueRow[] {
  const names = [actor.email, actor.name]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim().toLowerCase())
  if (names.length === 0) return []
  return queue.filter((item) => {
    const assigned = item.assignedAnalyst?.trim().toLowerCase()
    return assigned !== undefined && assigned !== '' && names.includes(assigned)
  })
}

/* ============================================================================
   Policy exposure
   ========================================================================== */

/** Open findings tallied by severity, in the product's canonical order. */
export function severityCounts(findings: readonly PolicyFinding[]): SeverityCount[] {
  const tally = new Map<Severity, number>()
  for (const finding of findings) {
    tally.set(finding.severity, (tally.get(finding.severity) ?? 0) + 1)
  }
  return SEVERITY_ORDER.filter((severity) => tally.has(severity)).map((severity) => ({
    severity,
    count: tally.get(severity) ?? 0,
  }))
}

/** Findings a human is expected to act on this week. */
export function highRiskCount(findings: readonly PolicyFinding[]): number {
  return findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high')
    .length
}

/* ============================================================================
   System warnings
   ========================================================================== */

export type WarningTone = 'critical' | 'high' | 'medium'

export interface SystemWarning {
  id: string
  tone: WarningTone
  /** What is wrong, in one clause. */
  title: string
  /** What it means for the work on this screen. */
  detail: string
  to?: string
  linkLabel?: string
}

export interface SystemWarningInput {
  capabilities?: Capabilities
  sandbox?: SandboxCapabilities
  integrations?: readonly Integration[]
  runs: readonly RunSummary[]
}

const TONE_RANK: Record<WarningTone, number> = { critical: 0, high: 1, medium: 2 }

/**
 * Every degraded capability this deployment is currently reporting.
 *
 * Absent input means "not answered yet", not "healthy" — a query still in
 * flight produces no warning rather than a reassuring silence that later turns
 * out to have been wrong.
 */
export function systemWarnings({
  capabilities,
  sandbox,
  integrations,
  runs,
}: SystemWarningInput): SystemWarning[] {
  const warnings: SystemWarning[] = []

  if (capabilities?.ai_provider === 'mock') {
    warnings.push({
      id: 'ai-provider',
      tone: 'medium',
      title: 'No language model is connected',
      detail:
        'Conversion writes training from a fixed template. Anything generated here is labelled Template, never AI generated.',
    })
  }

  if (sandbox && !sandbox.dynamic_worker) {
    warnings.push({
      id: 'sandbox-dynamic',
      tone: 'medium',
      title: 'Dynamic detonation is not available',
      detail:
        'Analysis runs static analyzers only. Behaviour that appears solely at runtime will not be observed, and verdicts say so.',
      to: '/sandbox',
      linkLabel: 'Open the sandbox',
    })
  }

  const unavailable = Object.keys(sandbox?.unavailable_analyzers ?? {})
  if (unavailable.length > 0) {
    warnings.push({
      id: 'sandbox-analyzers',
      tone: 'medium',
      title: `${unavailable.length} static ${unavailable.length === 1 ? 'analyzer is' : 'analyzers are'} unavailable`,
      detail: `Not running: ${unavailable.join(', ')}. Signals those analyzers would raise cannot appear in a verdict.`,
      to: '/sandbox',
      linkLabel: 'Open the sandbox',
    })
  }

  if (sandbox?.yara && (sandbox.yara.error || sandbox.yara.loaded === 0)) {
    warnings.push({
      id: 'sandbox-yara',
      tone: 'high',
      title: 'No YARA rules are loaded',
      detail:
        sandbox.yara.error ?? 'The rule set compiled to zero rules, so no YARA signal can fire.',
      to: '/sandbox',
      linkLabel: 'Open the sandbox',
    })
  }

  const failedIntegrations = (integrations ?? []).filter(
    (integration) => integration.status === 'error',
  )
  if (failedIntegrations.length > 0) {
    warnings.push({
      id: 'integrations-error',
      tone: 'critical',
      title: `${failedIntegrations.length} ${failedIntegrations.length === 1 ? 'integration is' : 'integrations are'} in error`,
      detail: failedIntegrations.map((integration) => integration.display_name).join(', '),
      to: '/integrations',
      linkLabel: 'Open integrations',
    })
  }

  const degraded = (integrations ?? []).filter((integration) => integration.status === 'degraded')
  if (degraded.length > 0) {
    warnings.push({
      id: 'integrations-degraded',
      tone: 'high',
      title: `${degraded.length} ${degraded.length === 1 ? 'integration is' : 'integrations are'} degraded`,
      detail: degraded.map((integration) => integration.display_name).join(', '),
      to: '/integrations',
      linkLabel: 'Open integrations',
    })
  }

  const failedRuns = runs.filter((run) => run.status === 'failed')
  if (failedRuns.length > 0) {
    warnings.push({
      id: 'runs-failed',
      tone: 'critical',
      title: `${failedRuns.length} loop ${failedRuns.length === 1 ? 'run has' : 'runs have'} failed`,
      detail: `Run ${failedRuns
        .slice(0, 4)
        .map((run) => `#${run.id}`)
        .join(', ')}${failedRuns.length > 4 ? ` and ${failedRuns.length - 4} more` : ''} stopped before closing the loop.`,
      to: '/loops',
      linkLabel: 'Open closed loops',
    })
  }

  return warnings.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
}
