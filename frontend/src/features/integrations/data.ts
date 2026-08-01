/**
 * Integration vocabulary, and the two envelopes the API actually sends.
 *
 * Two things live here that a page must not improvise.
 *
 * **What a status means.** `configured` and `connected` look alike in a list
 * and are not the same claim: the first is a statement about local settings,
 * the second asserts that something reached the provider. The server refuses to
 * let anyone hand-set the second for exactly that reason, and this table repeats
 * the distinction in words so a viewer reading a wall of chips can tell which
 * connections are real.
 *
 * **Secrets are never echoed.** `config_summary` is a free-form JSON column.
 * The API refuses credential-shaped keys on the way in, but a column that has
 * ever been written by another path is one this UI must not print — so the same
 * marker list is applied again on the way out, and a matching key renders as
 * withheld rather than as its value.
 */

import type { ExternalCourse, IntegrationProvider, IntegrationStatus } from '../../domain/types'

/* ============================================================================
   Providers
   ========================================================================== */

export const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  udemy_business: 'Udemy Business',
  moodle: 'Moodle',
  cornerstone: 'Cornerstone OnDemand',
  sap_successfactors: 'SAP SuccessFactors',
  viva_learning: 'Microsoft Viva Learning',
  scorm: 'SCORM package host',
  xapi: 'xAPI learning record store',
  lti: 'LTI 1.3 tool consumer',
  custom_lms: 'Custom LMS',
  sso_saml: 'SAML single sign-on',
  sso_oidc: 'OpenID Connect single sign-on',
}

/** Which half of the page a connection belongs to. */
export type IntegrationGroup = 'learning' | 'identity'

const IDENTITY_PROVIDERS = new Set<string>(['sso_saml', 'sso_oidc'])

export function groupOf(provider: string): IntegrationGroup {
  return IDENTITY_PROVIDERS.has(provider) ? 'identity' : 'learning'
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider as IntegrationProvider] ?? provider
}

/* ============================================================================
   Statuses
   ========================================================================== */

/** One sentence per state, written so a wall of chips is readable at a glance. */
export const STATUS_MEANING: Record<IntegrationStatus, string> = {
  not_configured: 'Nothing has been entered for this connection. It does nothing.',
  configured:
    'Local settings are stored. This says nothing about the provider — no request has succeeded against it.',
  connected: 'A sync reached the provider and it answered. Only a real sync can assert this.',
  degraded: 'The provider answered, but not completely. Part of the last sync did not land.',
  error: 'The last attempt against the provider failed. What it returned is below.',
  disabled: 'Turned off deliberately. Course imports and completion sync are stopped.',
}

export const SYNC_STATUS_MEANING: Record<string, string> = {
  never: 'This connection has never synced.',
  ok: 'The last sync completed.',
  partial: 'The last sync returned only part of the catalogue.',
  failed: 'The last sync failed.',
}

/** True when the API will refuse a sync outright rather than attempt one. */
export function syncRefused(status: string): boolean {
  return status === 'not_configured' || status === 'disabled'
}

/* ============================================================================
   Configuration — display side
   ========================================================================== */

/**
 * The same markers the API refuses on write. Applied again on read: a value
 * this UI prints ends up in screenshots, recordings and support tickets, and
 * "the schema has no such field" is not a guarantee about a JSON column.
 */
const SECRET_MARKERS = [
  'secret',
  'token',
  'password',
  'passwd',
  'credential',
  'api_key',
  'apikey',
  'private_key',
  'access_key',
  'authorization',
  'bearer',
  'signature',
]

export function isSecretLike(key: string): boolean {
  const lower = key.toLowerCase()
  return SECRET_MARKERS.some((marker) => lower.includes(marker))
}

export interface ConfigEntry {
  key: string
  label: string
  /** Null when the key is credential-shaped — the value is deliberately not read. */
  value: string | null
}

/** Flattens `config_summary` for display, withholding anything secret-shaped. */
export function configEntries(summary: Record<string, unknown> | null | undefined): ConfigEntry[] {
  if (!summary) return []
  return Object.entries(summary).map(([key, value]) => ({
    key,
    label: key.replace(/[_-]/g, ' '),
    value: isSecretLike(key) ? null : formatConfigValue(value),
  }))
}

function formatConfigValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value || '—'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(', ') || '—'
  return JSON.stringify(value)
}

/* ============================================================================
   Envelopes the frozen hooks do not unwrap
   ========================================================================== */

export interface CoursePage {
  items: ExternalCourse[]
  total: number
  truncated: boolean
  /** The server's own sentence about how this catalogue came to exist. */
  note: string | null
  lastSyncStatus: string | null
  lastSyncAt: string | null
}

const EMPTY_PAGE: CoursePage = {
  items: [],
  total: 0,
  truncated: false,
  note: null,
  lastSyncStatus: null,
  lastSyncAt: null,
}

/**
 * `/api/integrations/{id}/courses` answers with an `{items,total,…}` envelope
 * carrying a `catalogue_note`, while the frozen read hook is typed as a bare
 * array. Both shapes are accepted here rather than the note being dropped —
 * that note is the difference between "two courses" and "two courses, because
 * nine were refused".
 */
export function coursePageOf(payload: unknown): CoursePage {
  if (Array.isArray(payload)) {
    return { ...EMPTY_PAGE, items: payload as ExternalCourse[], total: payload.length }
  }
  if (!payload || typeof payload !== 'object') return EMPTY_PAGE

  const envelope = payload as {
    items?: ExternalCourse[]
    total?: number
    truncated?: boolean
    catalogue_note?: string
    last_sync_status?: string
    last_sync_at?: string | null
  }
  const items = Array.isArray(envelope.items) ? envelope.items : []
  return {
    items,
    total: typeof envelope.total === 'number' ? envelope.total : items.length,
    truncated: envelope.truncated === true,
    note: envelope.catalogue_note ?? null,
    lastSyncStatus: envelope.last_sync_status ?? null,
    lastSyncAt: envelope.last_sync_at ?? null,
  }
}

/** What `/sync` reports back. `attempted` is the field that matters. */
export interface SyncOutcome {
  attempted: boolean
  status: string
  coursesImported: number
  error: string | null
}

export function syncOutcomeOf(payload: unknown): SyncOutcome | null {
  if (!payload || typeof payload !== 'object') return null
  const result = payload as {
    attempted?: boolean
    status?: string
    courses_imported?: number
    error?: string | null
  }
  if (typeof result.attempted !== 'boolean') return null
  return {
    attempted: result.attempted,
    status: result.status ?? 'unknown',
    coursesImported: result.courses_imported ?? 0,
    error: result.error ?? null,
  }
}
