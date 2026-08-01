/**
 * Reading the policy API honestly.
 *
 * Two mismatches between the frozen read hooks and the server they talk to are
 * resolved here rather than in every screen.
 *
 * **The list endpoints answer with a page envelope.** `/api/policy/policies` and
 * `/api/policy/findings` return `{items, total, limit, offset, truncated, note}`
 * while `usePolicies` and `usePolicyFindings` are typed as bare arrays. Reading
 * through `itemsOf` / `pageMetaOf` keeps the screens correct against the real
 * response *and* keeps `truncated` on screen — the whole reason the envelope
 * exists is that a silently shortened list of critical findings is worse than
 * no list at all.
 *
 * **The detail endpoints answer with more than the shared domain type.** A
 * finding detail resolves its departments and employees to names (and says so
 * when an id no longer resolves); a policy detail carries rule counts. Those
 * fields are declared here as response types rather than added to the frozen
 * `domain/types.ts`, because they exist only on the detail routes.
 *
 * Nothing in this file invents a value. Every reader returns `null` where the
 * server did not send something, so the caller has to say "not measured".
 */

import type {
  IntelItem,
  Policy,
  PolicyDetail,
  PolicyFinding,
  PolicyRule,
} from '../../domain/types'

/* ============================================================================
   Page envelopes
   ========================================================================== */

export interface PageMeta {
  /** How many rows exist server-side. `null` when the response was a bare array. */
  total: number | null
  /** True when `total` is a floor: the server filtered over a capped scan. */
  truncated: boolean
  /** The server's own sentence about the cap. Rendered verbatim when present. */
  note: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The rows out of either shape. Never throws, never fabricates a row. */
export function itemsOf<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (isRecord(data) && Array.isArray(data.items)) return data.items as T[]
  return []
}

export function pageMetaOf(data: unknown): PageMeta {
  if (isRecord(data) && typeof data.total === 'number') {
    return {
      total: data.total,
      truncated: data.truncated === true,
      note: typeof data.note === 'string' ? data.note : '',
    }
  }
  return { total: null, truncated: false, note: '' }
}

/** "Showing 12 of 48 findings" — or just the count when there is no total. */
export function showingLabel(
  shown: number,
  meta: PageMeta,
  one: string,
  many: string,
): string {
  if (meta.total === null || meta.total <= shown) {
    return `${shown} ${shown === 1 ? one : many}`
  }
  return `Showing ${shown} of ${meta.truncated ? 'at least ' : ''}${meta.total} ${meta.total === 1 ? one : many}`
}

/* ============================================================================
   /api/policy/stats
   ========================================================================== */

/**
 * The stats payload, narrowed from `Record<string, unknown>`.
 *
 * Every field is required: a partial stats response is a broken response, and
 * filling the gaps with zeros would turn "the server did not answer this" into
 * "there are none of these". `readPolicyStats` returns `null` instead, and the
 * overview says the counts are unavailable.
 */
export interface PolicyStats {
  window_days: number
  window_start: string | null
  window_end: string | null
  sample_size: number
  total_all_time: number
  outside_window: number
  by_severity: Record<string, number>
  by_status: Record<string, number>
  by_finding_type: Record<string, number>
  overdue_open_all_time: number
  note: string
}

function counts(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null
  const out: Record<string, number> = {}
  for (const [key, count] of Object.entries(value)) {
    if (typeof count !== 'number' || !Number.isFinite(count)) return null
    out[key] = count
  }
  return out
}

export function readPolicyStats(raw: Record<string, unknown> | undefined): PolicyStats | null {
  if (!isRecord(raw)) return null
  const bySeverity = counts(raw.by_severity)
  const byStatus = counts(raw.by_status)
  const byType = counts(raw.by_finding_type)
  if (!bySeverity || !byStatus || !byType) return null

  const numbers = ['window_days', 'sample_size', 'total_all_time', 'outside_window', 'overdue_open_all_time']
  for (const key of numbers) {
    if (typeof raw[key] !== 'number') return null
  }

  return {
    window_days: raw.window_days as number,
    window_start: typeof raw.window_start === 'string' ? raw.window_start : null,
    window_end: typeof raw.window_end === 'string' ? raw.window_end : null,
    sample_size: raw.sample_size as number,
    total_all_time: raw.total_all_time as number,
    outside_window: raw.outside_window as number,
    by_severity: bySeverity,
    by_status: byStatus,
    by_finding_type: byType,
    overdue_open_all_time: raw.overdue_open_all_time as number,
    note: typeof raw.note === 'string' ? raw.note : '',
  }
}

/** Sums the named keys. Missing keys contribute nothing rather than crashing. */
export function sumOf(source: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((total, key) => total + (source[key] ?? 0), 0)
}

/* ============================================================================
   Detail responses
   ========================================================================== */

/**
 * `GET /api/policy/policies/{id}` also carries rule counts by status and the
 * open-finding count. The shared `PolicyDetail` predates both.
 */
export type PolicyDetailResponse = PolicyDetail & {
  rule_counts?: Record<string, number>
  open_finding_count?: number
}

/** An id the server could not resolve is reported, never dropped. */
export interface AffectedDepartmentRef {
  id: number
  name: string | null
  resolved: boolean
}

export interface AffectedEmployeeRef {
  id: number
  name: string | null
  email?: string
  department_name?: string
  /** `active` | `on_leave` | `left`. Carried so an unassignable person is visible. */
  employment_status?: string
  resolved: boolean
}

export type PolicyFindingDetailResponse = PolicyFinding & {
  policy_version?: string
  rule?: PolicyRule | null
  affected_departments?: AffectedDepartmentRef[]
  affected_employees?: AffectedEmployeeRef[]
  intel_item?: IntelItem | null
  /** Set only when the cited advisory is no longer in the intel store. */
  intel_lookup_note?: string
}

/* ============================================================================
   Mutation responses
   ========================================================================== */

/**
 * `POST /policies/{id}/extract`. `attempted` is the load-bearing field: it
 * separates "an engine read the document and found nothing" from "no engine
 * ever saw it", and `reason` is the sentence to show a reviewer verbatim.
 */
export interface ExtractionResult {
  policy_id: number
  attempted: boolean
  extraction_status: string
  extraction_source: string
  rules_proposed: number
  reason: string
}

export function readExtractionResult(raw: unknown): ExtractionResult | null {
  if (!isRecord(raw) || typeof raw.attempted !== 'boolean') return null
  return {
    policy_id: typeof raw.policy_id === 'number' ? raw.policy_id : 0,
    attempted: raw.attempted,
    extraction_status: typeof raw.extraction_status === 'string' ? raw.extraction_status : '',
    extraction_source: typeof raw.extraction_source === 'string' ? raw.extraction_source : '',
    rules_proposed: typeof raw.rules_proposed === 'number' ? raw.rules_proposed : 0,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
  }
}

/**
 * `POST /findings/{id}/assign-training`. `skipped` is not decoration: a partial
 * assignment reported as a success is how somebody on long-term leave ends up
 * counted as trained. `linkage_note` states how durable the finding→assignment
 * link actually is in this build.
 */
export interface TrainingAssignResult {
  finding_id: number
  module_id: number
  module_title: string
  assigned: { employee_id: number; name?: string; assignment_id: number }[]
  skipped: { employee_id: number; name?: string; reason: string }[]
  finding_status: string
  linkage_note: string
}

function assignedRows(value: unknown): TrainingAssignResult['assigned'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.employee_id !== 'number') return []
    return [
      {
        employee_id: row.employee_id,
        name: typeof row.name === 'string' ? row.name : undefined,
        assignment_id: typeof row.assignment_id === 'number' ? row.assignment_id : 0,
      },
    ]
  })
}

function skippedRows(value: unknown): TrainingAssignResult['skipped'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.employee_id !== 'number') return []
    return [
      {
        employee_id: row.employee_id,
        name: typeof row.name === 'string' ? row.name : undefined,
        reason: typeof row.reason === 'string' ? row.reason : 'No reason was given.',
      },
    ]
  })
}

export function readTrainingAssignResult(raw: unknown): TrainingAssignResult | null {
  if (!isRecord(raw) || typeof raw.finding_id !== 'number') return null
  return {
    finding_id: raw.finding_id,
    module_id: typeof raw.module_id === 'number' ? raw.module_id : 0,
    module_title: typeof raw.module_title === 'string' ? raw.module_title : '',
    assigned: assignedRows(raw.assigned),
    skipped: skippedRows(raw.skipped),
    finding_status: typeof raw.finding_status === 'string' ? raw.finding_status : '',
    linkage_note: typeof raw.linkage_note === 'string' ? raw.linkage_note : '',
  }
}

/* ============================================================================
   Small derivations the screens share
   ========================================================================== */

/**
 * One unfiltered page of findings, shared by every screen that needs the whole
 * set — the drift ranking, the per-policy counts, and the filter option lists.
 * Declared once at module scope so React Query hashes it to a single cache
 * entry instead of refetching the same rows per screen.
 */
export const ALL_FINDINGS_PAGE: Record<string, string | number | undefined> = { limit: 200 }

/** Findings that have not reached a terminal state. Mirrors the router's set. */
export const OPEN_FINDING_STATUSES = [
  'open',
  'in_review',
  'remediation_planned',
  'training_assigned',
] as const

export function isOpenFinding(finding: PolicyFinding): boolean {
  return (OPEN_FINDING_STATUSES as readonly string[]).includes(finding.status)
}

/** Open findings per policy id, for the "most in drift" ranking. */
export function openFindingsByPolicy(findings: PolicyFinding[]): Map<number, PolicyFinding[]> {
  const grouped = new Map<number, PolicyFinding[]>()
  for (const finding of findings) {
    if (finding.policy_id === null || !isOpenFinding(finding)) continue
    const bucket = grouped.get(finding.policy_id)
    if (bucket) bucket.push(finding)
    else grouped.set(finding.policy_id, [finding])
  }
  return grouped
}

/** The distinct technologies a policy's own rules name. Accurate only on a detail. */
export function technologiesOf(rules: PolicyRule[] | undefined): string[] {
  if (!rules) return []
  const seen = new Set<string>()
  for (const rule of rules) {
    const technology = rule.technology?.trim()
    if (technology) seen.add(technology)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

/** Department names for the ids a policy declares, in the order declared. */
export function departmentNames(
  ids: (string | number)[] | undefined,
  lookup: Map<number, string>,
): string[] {
  if (!ids || ids.length === 0) return []
  return ids.map((id) => (typeof id === 'number' ? (lookup.get(id) ?? `Department ${id}`) : String(id)))
}

export type { Policy, PolicyFinding, PolicyRule }
