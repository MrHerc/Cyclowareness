/**
 * Intake filtering, held in the URL.
 *
 * A filtered triage queue is something one analyst hands to another — "the two
 * unresolved file reports from Finance" is a link, not a sentence. Keeping the
 * filters in the query string is what makes that possible, and it is also what
 * makes a narrowed view survive the 15-second poll, the back button and a reload.
 *
 * The predicates below compare strings the server actually returns. Nothing here
 * derives a severity a record does not carry: a `Threat` has a verdict and a
 * confidence and no severity at all, and manufacturing a band from those two
 * would put a label on the screen that no analyzer ever asserted.
 */

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SelectOption } from '../../components/ui'
import { channelLabel, humanise } from '../../lib/format'

/** The "no filter" sentinel. Radix Select has no empty-string value. */
export const ALL = 'all'

/**
 * One filter, mirrored into the query string.
 *
 * A value equal to the fallback is removed rather than written, so the clean
 * state of the page is a clean URL — and `replace` keeps a run of filter
 * changes from burying the previous page under twenty history entries.
 */
export function useUrlParam(
  key: string,
  fallback: string,
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback

  const set = useCallback(
    (next: string) => {
      setParams(
        (current) => {
          const out = new URLSearchParams(current)
          if (!next || next === fallback) out.delete(key)
          else out.set(key, next)
          return out
        },
        { replace: true },
      )
    },
    [key, fallback, setParams],
  )

  return [value, set]
}

/* ============================================================================
   Predicates
   ========================================================================== */

/** Case-insensitive substring match across whichever fields the caller passes. */
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle))
}

/** `ALL` passes everything; anything else is an exact match. */
export function matchesValue(selected: string, actual: string | null | undefined): boolean {
  return selected === ALL || selected === (actual ?? '')
}

/* ============================================================================
   Option lists
   ========================================================================== */

/**
 * Artifact types are built from the rows on screen rather than from a constant.
 * The backend accepts any string in `artifact_type`, so a hard-coded list would
 * silently hide a record the moment someone submits a type nobody predicted.
 */
export function artifactTypeOptions(types: (string | null | undefined)[]): SelectOption[] {
  const unique = Array.from(new Set(types.filter((t): t is string => Boolean(t)))).sort()
  return [
    { value: ALL, label: 'Any artifact type' },
    ...unique.map((type) => ({ value: type, label: channelLabel(type) })),
  ]
}

export const SOURCE_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'Any source' },
  { value: 'human_sensor', label: 'Human sensor' },
  { value: 'feed', label: 'Curated feed' },
  { value: 'manual', label: 'Analyst submission' },
]

export const VERDICT_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'Any verdict' },
  { value: 'malicious', label: 'Malicious' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'benign', label: 'Benign' },
  { value: 'none', label: 'No verdict recorded' },
]

export const REPORT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'new', label: 'Awaiting triage' },
  { value: 'in_loop', label: 'Pushed into the loop' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: ALL, label: 'Every report' },
]

export const SUSPICION_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'Any suspicion level' },
  { value: 'high', label: 'High suspicion' },
  { value: 'medium', label: 'Medium suspicion' },
  { value: 'low', label: 'Low suspicion' },
]

export const SEVERITY_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'Any severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
]

/** The types `ThreatSubmit` documents. Anything else is rejected downstream. */
export const ARTIFACT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File' },
  { value: 'sms', label: 'SMS' },
  { value: 'qr', label: 'QR code' },
  { value: 'chat', label: 'Chat message' },
]

/* ============================================================================
   artifact_meta — attacker-adjacent JSON, rendered but never trusted
   ========================================================================== */

/**
 * `artifact_meta` is a free-form JSON column. On a report it is written by
 * whoever pressed "report this", which is why the push-to-loop route strips the
 * keys that steer targeting. Everything below therefore treats it as data of
 * unknown shape: no key is assumed present, no value is assumed to be a string.
 */
export type ArtifactMeta = Record<string, unknown> | null | undefined

export function metaText(meta: ArtifactMeta, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

export function metaList(meta: ArtifactMeta, key: string): string[] {
  const value = meta?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

/** One line describing how far the artifact reached, or null when unrecorded. */
export function reachOf(meta: ArtifactMeta): string | null {
  const departments = metaList(meta, 'targeted_departments')
  if (departments.length) return departments.join(', ')
  const recipients = metaList(meta, 'recipients')
  if (recipients.length) {
    return `${recipients.length} named recipient${recipients.length === 1 ? '' : 's'}`
  }
  return null
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.map(stringifyValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Every key on the record, flattened for display. Order is the server's. */
export function metaEntries(meta: ArtifactMeta): { label: string; value: string }[] {
  if (!meta) return []
  return Object.entries(meta).map(([key, value]) => ({
    label: humanise(key),
    value: stringifyValue(value),
  }))
}
