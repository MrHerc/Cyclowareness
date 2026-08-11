/**
 * The words this domain uses, in one table.
 *
 * The backend speaks in enum keys (`vulnerable_allowed_version`,
 * `version_ceiling`, `not_attempted`). `humanise()` turns most of them into
 * readable English, but a few carry meaning that sentence-casing destroys —
 * "Not attempted" and "Failed" are the difference between a document nobody
 * read and a document that could not be read, and that distinction is the whole
 * point of the extraction status field.
 *
 * The transition table is a copy of the router's. It is here so the UI does not
 * *offer* a move that would come back 409; the server remains the authority and
 * a rejected transition is still surfaced as the error it is.
 */

import { provenanceOf, type Provenance } from '../../domain/types'
import type { MessageKey } from '../../lib/i18n'
import type { SelectOption } from '../../components/ui'

/* ============================================================================
   Policies
   ========================================================================== */

export const POLICY_TYPE_LABELS: Record<string, string> = {
  security_policy: 'Security policy',
  whitelist: 'Whitelist',
  approved_software: 'Approved software',
  baseline: 'Baseline',
  exception_register: 'Exception register',
  access_policy: 'Access policy',
  incident_procedure: 'Incident procedure',
  vendor_requirement: 'Vendor requirement',
  control_document: 'Control document',
}

export const POLICY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under review',
  superseded: 'Superseded',
  retired: 'Retired',
}

export const EXTRACTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Extraction queued',
  extracted: 'Rules extracted',
  failed: 'Extraction failed',
  not_attempted: 'Never read',
}

/** One sentence per state, so the badge is never the only explanation. */
export const EXTRACTION_STATUS_MEANING: Record<string, string> = {
  pending: 'An extraction run has been requested and has not finished.',
  extracted: 'An engine read this document and proposed the rules below.',
  failed: 'An extraction run was made and did not produce rules. The reason is below.',
  not_attempted:
    'Nothing has ever read this document. That is not the same as reading it and finding no controls.',
}

export const EXTRACTION_SOURCE_LABELS: Record<string, string> = {
  '': 'No extraction claimed',
  manual: 'Typed by a person',
  mock: 'Offline generator',
  anthropic: 'Anthropic model',
}

/**
 * `extraction_source` onto the provenance vocabulary.
 *
 * `provenanceOf` handles the two values it was written for. The other two are
 * facts about people rather than about models: `manual` means somebody typed
 * the rules, and an empty source means nothing has ever claimed authorship of
 * them — which is "unknown", not "a human wrote it".
 */
export function extractionProvenance(source: string | null | undefined): Provenance {
  if (source === 'manual') return 'analyst_edited'
  if (!source) return 'unknown'
  return provenanceOf(source)
}

/* ============================================================================
   Rules
   ========================================================================== */

export const RULE_TYPE_LABELS: Record<string, string> = {
  allow: 'Allow',
  deny: 'Deny',
  require: 'Require',
  version_floor: 'Version floor',
  version_ceiling: 'Version ceiling',
  exception: 'Exception',
  control: 'Control',
}

/**
 * A rule with no extraction confidence was typed by a person — the API sets it
 * NULL precisely because a human's sentence has no extraction score. Everything
 * else inherits the provenance of the run that read the document.
 */
export function ruleProvenance(
  confidence: number | null,
  policySource: string | null | undefined,
): Provenance {
  if (confidence === null || confidence === undefined) return 'analyst_edited'
  return extractionProvenance(policySource)
}

/* ============================================================================
   Findings
   ========================================================================== */

export const FINDING_TYPE_LABELS: Record<string, string> = {
  outdated_approved_version: 'Outdated approved version',
  unsafe_whitelist_entry: 'Unsafe whitelist entry',
  vulnerable_allowed_version: 'Vulnerable allowed version',
  expired_exception: 'Expired exception',
  policy_conflict: 'Policy conflict',
  missing_control: 'Missing control',
  external_advisory_match: 'External advisory match',
  exposure_match: 'Exposure match',
}

export const FINDING_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_review: 'In review',
  remediation_planned: 'Remediation planned',
  training_assigned: 'Training assigned',
  resolved: 'Resolved',
  accepted_risk: 'Accepted risk',
  false_positive: 'False positive',
}

/** The order the overview draws the status breakdown in: live work first. */
export const FINDING_STATUS_ORDER = [
  'open',
  'in_review',
  'remediation_planned',
  'training_assigned',
  'resolved',
  'accepted_risk',
  'false_positive',
] as const

/** Moving into one of these is a claim the organisation may have to defend. */
export const TERMINAL_FINDING_STATUSES: readonly string[] = [
  'resolved',
  'accepted_risk',
  'false_positive',
]

/** A copy of the router's table. The server still decides; this stops dead ends. */
export const FINDING_TRANSITIONS: Record<string, readonly string[]> = {
  open: [
    'in_review',
    'remediation_planned',
    'training_assigned',
    'resolved',
    'accepted_risk',
    'false_positive',
  ],
  in_review: [
    'open',
    'remediation_planned',
    'training_assigned',
    'resolved',
    'accepted_risk',
    'false_positive',
  ],
  remediation_planned: ['in_review', 'training_assigned', 'resolved', 'accepted_risk'],
  training_assigned: ['in_review', 'remediation_planned', 'resolved', 'accepted_risk'],
  resolved: ['open'],
  accepted_risk: ['open', 'in_review'],
  false_positive: ['open'],
}

/** One shared empty array, so an unknown status does not produce a new one per render. */
const NO_MOVES: readonly string[] = []

export function legalMoves(from: string): readonly string[] {
  return FINDING_TRANSITIONS[from] ?? NO_MOVES
}

/** True when the API will refuse the move without a written reason. */
export function requiresNote(from: string, to: string): boolean {
  return TERMINAL_FINDING_STATUSES.includes(to) || TERMINAL_FINDING_STATUSES.includes(from)
}

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

/**
 * `PolicyFinding.source` is a dotted namespace and the API filters on prefix,
 * so "everything the intel feed raised" is `source=intel`.
 */
export const SOURCE_PREFIX_LABELS: Record<string, string> = {
  intel: 'Threat intelligence',
  policy: 'Policy review',
  scan: 'Estate scan',
  analyst: 'Raised by an analyst',
}

export function sourcePrefix(source: string | null | undefined): string {
  if (!source) return ''
  const [prefix] = source.split(':')
  return prefix ?? ''
}

export function sourceLabel(source: string | null | undefined): string {
  const prefix = sourcePrefix(source)
  return SOURCE_PREFIX_LABELS[prefix] ?? (prefix ? prefix : 'Source not recorded')
}

/* ============================================================================
   Select option builders
   ========================================================================== */

const ANY = { value: 'all', label: 'Any' }

export function optionsFrom(
  labels: Record<string, string>,
  anyLabel = 'Any',
  anyLabelKey?: MessageKey,
): SelectOption[] {
  return [
    { ...ANY, label: anyLabel, labelKey: anyLabelKey },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ]
}

export function optionsFromValues(
  values: string[],
  anyLabel = 'Any',
  anyLabelKey?: MessageKey,
): SelectOption[] {
  return [
    { ...ANY, label: anyLabel, labelKey: anyLabelKey },
    ...values.map((value) => ({ value, label: value })),
  ]
}

/* ============================================================================
   The findings queue's filter model
   ========================================================================== */

/**
 * The URL keys. Seven of them are the API's own parameter names, so they pass
 * straight through. `due` is the exception: it is a readable preset in the URL
 * and resolves to the API's `due_before` date at call time.
 */
export type FindingFilterKey =
  | 'severity'
  | 'status'
  | 'policy'
  | 'department'
  | 'technology'
  | 'source'
  | 'owner'
  | 'due'

export const FINDING_FILTER_KEYS = [
  'severity',
  'status',
  'policy',
  'department',
  'technology',
  'source',
  'owner',
  'due',
] as const satisfies readonly FindingFilterKey[]

/** Whole days. A timestamp here would make a new query key on every render. */
function dayOffset(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function dueBefore(preset: string): string | undefined {
  if (preset === 'overdue') return dayOffset(0)
  if (preset === '7d') return dayOffset(7)
  if (preset === '30d') return dayOffset(30)
  return undefined
}
