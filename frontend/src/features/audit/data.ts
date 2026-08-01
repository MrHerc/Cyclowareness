/**
 * The trail's vocabulary, and the envelope the frozen hook does not unwrap.
 *
 * `/api/audit` answers with `{events,total,limit,offset,truncated}` and
 * `/api/audit/actions` with `{action,count}` rows, while both read hooks are
 * typed loosely enough to accept either shape. The normalisers here take the
 * envelope seriously rather than flattening it away, because the only question
 * anyone asks a log is "did anything else happen" — and a page that returns 100
 * of 4 000 matches without saying so answers it wrongly, and silently.
 */

import type { AuditEvent } from '../../domain/types'

export const AUDIT_FILTER_KEYS = ['actor', 'action', 'object_type', 'q'] as const
export type AuditFilterKey = (typeof AUDIT_FILTER_KEYS)[number]

/* ============================================================================
   Envelopes
   ========================================================================== */

export interface AuditPageMeta {
  events: AuditEvent[]
  total: number
  limit: number
  truncated: boolean
}

const EMPTY: AuditPageMeta = { events: [], total: 0, limit: 0, truncated: false }

export function auditPageOf(payload: unknown): AuditPageMeta {
  if (Array.isArray(payload)) {
    const events = payload as AuditEvent[]
    return { events, total: events.length, limit: events.length, truncated: false }
  }
  if (!payload || typeof payload !== 'object') return EMPTY

  const envelope = payload as {
    events?: AuditEvent[]
    total?: number
    limit?: number
    truncated?: boolean
  }
  const events = Array.isArray(envelope.events) ? envelope.events : []
  return {
    events,
    total: typeof envelope.total === 'number' ? envelope.total : events.length,
    limit: typeof envelope.limit === 'number' ? envelope.limit : events.length,
    truncated: envelope.truncated === true,
  }
}

export interface AuditActionCount {
  action: string
  /** `null` when the API answered with bare verbs and no frequency. */
  count: number | null
}

/**
 * Accepts both `["policy.extract", …]` and `[{action, count}, …]`.
 *
 * The count is what makes the verb menu usable — it is the difference between
 * a verb somebody triggered once by accident and the one that runs all day — so
 * it is preserved where the server sends it rather than being discarded to fit
 * the simpler declared type.
 */
export function actionCountsOf(payload: unknown): AuditActionCount[] {
  if (!Array.isArray(payload)) return []
  const out: AuditActionCount[] = []
  for (const entry of payload) {
    if (typeof entry === 'string') {
      out.push({ action: entry, count: null })
      continue
    }
    if (entry && typeof entry === 'object') {
      const row = entry as { action?: unknown; count?: unknown }
      if (typeof row.action === 'string') {
        out.push({ action: row.action, count: typeof row.count === 'number' ? row.count : null })
      }
    }
  }
  return out
}

/* ============================================================================
   Reading a row
   ========================================================================== */

/**
 * The family a verb belongs to: `incident_risk.subject.review` -> `incident_risk`.
 * Used for grouping the verb menu, never for colouring — an audit entry is a
 * record of something that happened, not a severity.
 */
export function verbFamily(action: string): string {
  return action.split('.')[0] ?? action
}

/** Distinct, sorted, empties dropped. */
export function distinct(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

/**
 * A payload snapshot as text.
 *
 * `null` is preserved as the word "not captured" rather than printed as `{}`:
 * the API writes NULL when nothing changed and an empty object when the row was
 * genuinely blank, and those are different facts about the same field.
 */
export function payloadText(payload: Record<string, unknown> | null): string {
  if (payload === null || payload === undefined) return 'Not captured — this change had no snapshot.'
  return JSON.stringify(payload, null, 2)
}

/** A stable, readable identity for the object a row touched. */
export function objectIdentity(event: AuditEvent): string | null {
  if (!event.object_type) return null
  const id = event.object_id === null || event.object_id === undefined ? '' : String(event.object_id)
  return id ? `${event.object_type} #${id}` : event.object_type
}
