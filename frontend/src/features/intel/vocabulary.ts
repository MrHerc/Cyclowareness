/**
 * The words this screen uses, and the two answer shapes the intel API returns.
 *
 * Two things live here rather than in the pages that need them.
 *
 * - **Labels.** `humanise('nvd')` reads "Nvd", and an analyst who knows the
 *   feed by name should see the name. Every enum on this surface is small and
 *   closed, so it is spelled out once.
 *
 * - **Envelope reading.** `/api/intel/items` and `/api/intel/matches` answer
 *   with `{ items, total, truncated }`, while the frozen read hooks type the
 *   result as a bare list. Reading both shapes here keeps the page working
 *   against either without touching the foundation — and `total` is worth
 *   having anyway: a list that shows 50 of 137 rows and says nothing has made a
 *   claim about coverage it never checked.
 */

import type { SelectOption } from '../../components/ui'
import type { MessageKey } from '../../lib/i18n'
import type {
  FindingType,
  IntelMatch,
  IntelRefreshResult,
  IntelRelevance,
  IntelSource,
  IntelType,
  Severity,
} from '../../domain/types'
import { humanise } from '../../lib/format'

/** Radix Select has no "unset" affordance, so the cleared state is a real option. */
export const ANY = 'any'

export const SOURCE_LABEL: Record<IntelSource, string> = {
  nvd: 'NVD',
  cisa: 'CISA',
  cert: 'National CERT',
  vendor: 'Vendor advisory',
  research: 'Security research',
  osint: 'OSINT',
  breach_monitor: 'Breach monitor',
  feed: 'Curated feed',
}

export const TYPE_LABEL: Record<IntelType, string> = {
  vulnerability: 'Vulnerability',
  advisory: 'Advisory',
  campaign: 'Campaign',
  ransomware: 'Ransomware',
  credential_exposure: 'Credential exposure',
  ioc: 'Indicators',
  research: 'Research',
}

export const RELEVANCE_LABEL: Record<IntelRelevance, string> = {
  unassessed: 'Unassessed',
  not_applicable: 'Not applicable',
  monitoring: 'Monitoring',
  relevant: 'Relevant',
  urgent: 'Urgent',
}

export const MATCH_TYPE_LABEL: Record<IntelMatch['match_type'], string> = {
  approved_software: 'Approved software',
  policy_rule: 'Policy rule',
  technology_in_use: 'Technology in use',
  department_exposure: 'Department exposure',
  credential_domain: 'Credential domain',
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

const FINDING_TYPES: FindingType[] = [
  'external_advisory_match',
  'vulnerable_allowed_version',
  'outdated_approved_version',
  'unsafe_whitelist_entry',
  'expired_exception',
  'policy_conflict',
  'missing_control',
  'exposure_match',
]

function options(labels: Record<string, string>): SelectOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }))
}

const anyOption = (label: string): SelectOption => ({ value: ANY, label })

export const SOURCE_OPTIONS: SelectOption[] = [anyOption('Any source'), ...options(SOURCE_LABEL)]
export const TYPE_OPTIONS: SelectOption[] = [anyOption('Any type'), ...options(TYPE_LABEL)]
export const SEVERITY_OPTIONS: SelectOption[] = [
  anyOption('Any severity'),
  ...SEVERITIES.map((value) => ({ value, label: humanise(value) })),
]
export const RELEVANCE_OPTIONS: SelectOption[] = [
  anyOption('Any assessment'),
  ...options(RELEVANCE_LABEL),
]

/** Severity of a finding raised from an advisory. `info` is deliberately absent. */
export const FINDING_SEVERITY_OPTIONS: SelectOption[] = SEVERITIES.filter(
  (value) => value !== 'info',
).map((value) => ({ value, label: humanise(value) }))

export const FINDING_TYPE_OPTIONS: SelectOption[] = FINDING_TYPES.map((value) => ({
  value,
  label: humanise(value),
}))

/**
 * The four judgements an analyst may assert. `unassessed` is missing on purpose:
 * it is the absence of a judgement, and the API refuses to have one asserted.
 */
export const ASSESSABLE_RELEVANCE: {
  value: IntelRelevance
  label: string
  labelKey: MessageKey
  hint: string
  hintKey: MessageKey
}[] = [
  {
    value: 'urgent',
    label: 'Urgent', labelKey: 'u.urgent',
    hint: 'It reaches something we run and it needs action now.',
    hintKey: 'u.it-reaches-something-we-run',
  },
  {
    value: 'relevant',
    label: 'Relevant', labelKey: 'u.relevant',
    hint: 'It applies to this organisation and belongs in the queue.',
    hintKey: 'u.it-applies-to-this-organisation-and',
  },
  {
    value: 'monitoring',
    label: 'Monitoring', labelKey: 'u.monitoring',
    hint: 'It could apply. Watch it; do not act yet.',
    hintKey: 'u.it-could-apply-watch-it',
  },
  {
    value: 'not_applicable',
    label: 'Not applicable', labelKey: 'u.not-applicable',
    hint: 'We assessed it and it does not touch us. A reason is required.',
    hintKey: 'u.we-assessed-it-and-it-does-not',
  },
]

/* ============================================================================
   Reading what the API actually sent
   ========================================================================== */

export interface PageView<T> {
  items: T[]
  /** Size of the set the page was cut from. Null when the API sent a bare list. */
  total: number | null
  /** True when the API said there are more rows than it returned. */
  truncated: boolean
}

export function readPage<T>(data: unknown): PageView<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length, truncated: false }
  }
  if (data && typeof data === 'object') {
    const envelope = data as { items?: unknown; total?: unknown; truncated?: unknown }
    if (Array.isArray(envelope.items)) {
      return {
        items: envelope.items as T[],
        total: typeof envelope.total === 'number' ? envelope.total : null,
        truncated: envelope.truncated === true,
      }
    }
  }
  return { items: [], total: null, truncated: false }
}

/* ============================================================================
   The refresh answer
   ========================================================================== */

/**
 * What "check sources now" reported.
 *
 * Every count is `number | null` because "we checked nothing" and "the server
 * did not say how much it checked" are different facts, and this screen exists
 * to keep them apart.
 */
export interface RefreshView {
  configuredSources: string[]
  /** Null when the deployment did not say whether it tried. */
  attempted: boolean | null
  sourcesChecked: number | null
  itemsAdded: number | null
  itemsUpdated: number | null
  requestedAt: string | null
  detail: string | null
  /** What an operator would have to do for a refresh to mean anything. */
  nextStep: string | null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function int(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Reads the refresh result under either field naming. The server answers
 * `sources_checked` / `items_added` / `detail` / `next_step`; the frozen client
 * type names them `checked` / `new_items` / `message`. Neither is guessed at —
 * a name that is absent yields null, which the panel renders as "not reported".
 */
export function readRefresh(result: IntelRefreshResult | undefined | null): RefreshView | null {
  if (!result) return null
  const raw = result as unknown as Record<string, unknown>
  const sources = raw.configured_sources
  return {
    configuredSources: Array.isArray(sources) ? sources.filter((s): s is string => typeof s === 'string') : [],
    attempted: typeof raw.attempted === 'boolean' ? raw.attempted : null,
    sourcesChecked: int(raw.sources_checked) ?? int(raw.checked),
    itemsAdded: int(raw.items_added) ?? int(raw.new_items),
    itemsUpdated: int(raw.items_updated),
    requestedAt: str(raw.requested_at),
    detail: str(raw.detail) ?? str(raw.message),
    nextStep: str(raw.next_step),
  }
}
