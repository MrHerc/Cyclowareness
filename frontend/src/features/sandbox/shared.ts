/**
 * The vocabulary the two sandbox screens share.
 *
 * Everything here is a translation — a backend id into a sentence a person can
 * read — and nothing here invents a fact. A key this file does not know falls
 * through to `humanise()` rather than to a plausible guess, because a wrong
 * label on a forensic report is indistinguishable from a wrong finding.
 */

import type { AnalyzerResultView, SandboxJobSummary, SandboxSignal } from '../../domain/types'
import type { EvidenceItem } from '../../components/data'
import { defang, humanise } from '../../lib/format'

/* ============================================================================
   Severity
   ========================================================================== */

/**
 * Highest first. Deliberately duplicated from `charts/chartTheme` rather than
 * imported: that barrel pulls Recharts in, and the sandbox report has no chart
 * on it — importing one constant would put the whole plotting library into this
 * route's lazy chunk.
 */
const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
}

export function severityRank(severity: string | null | undefined): number {
  return SEVERITY_RANK[(severity ?? '').toLowerCase()] ?? 0
}

/** Sorts a copy — the caller's array is usually React Query's cached data. */
export function worstFirst<T extends { severity: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

/** One signal, carrying the analyzer that raised it. */
export interface RankedSignal extends SandboxSignal {
  analyzer: string
}

/**
 * Every signal from every analyzer that actually ran, worst first.
 *
 * Analyzers that did not run are skipped rather than contributing an empty
 * list — their absence is reported separately, where it can be explained.
 */
export function collectSignals(
  analysis: Record<string, AnalyzerResultView> | null | undefined,
): RankedSignal[] {
  const out: RankedSignal[] = []
  for (const [name, result] of Object.entries(analysis ?? {})) {
    if (!result?.ran) continue
    for (const signal of result.signals ?? []) {
      out.push({ ...signal, analyzer: signal.analyzer ?? name })
    }
  }
  return worstFirst(out)
}

/** Counts per severity, for the summary line above a long signal list. */
export function severityCounts(signals: readonly { severity: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const signal of signals) {
    counts[signal.severity] = (counts[signal.severity] ?? 0) + 1
  }
  return counts
}

/**
 * A signal's `evidence` bag, flattened for display.
 *
 * Values are stringified rather than dropped: the evidence is the part a human
 * checks, and silently omitting a nested object would hide the one field that
 * made the signal defensible.
 */
export function evidenceItems(evidence: Record<string, unknown> | null | undefined): EvidenceItem[] {
  return Object.entries(evidence ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      label: humanise(key),
      value:
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value),
    }))
}

/* ============================================================================
   Naming
   ========================================================================== */

/** What the submitter handed over: a filename, or the URL we were asked to fetch. */
export function sampleLabel(
  job: Pick<SandboxJobSummary, 'original_name' | 'submitted_url' | 'source'>,
): string {
  if (job.source === 'url' && job.submitted_url) return defang(job.submitted_url)
  return job.original_name || 'Unnamed sample'
}

/**
 * Whether this job has a verdict at all.
 *
 * `final_score` defaults to 0 and `risk_level` to "low" on the row the moment a
 * job is created, so a queued sample would otherwise render as a confident
 * "Low · 0" — a clean bill of health for something nobody has looked at yet.
 * Everywhere a score is shown, this gates it.
 */
export function isScored(job: Pick<SandboxJobSummary, 'status'>): boolean {
  return job.status === 'completed'
}

const ANALYZER_LABELS: Record<string, string> = {
  generic: 'Generic content',
  pe: 'PE — Windows executable',
  elf: 'ELF — Linux executable',
  office: 'Office document',
  script: 'Script',
  pdf: 'PDF',
  archive: 'Archive',
  'archive-contents': 'Archive contents',
  yara: 'YARA',
}

export function analyzerLabel(name: string): string {
  return ANALYZER_LABELS[name] ?? humanise(name)
}

const FEATURE_LABELS: Record<string, string> = {
  yara_hits: 'YARA rule hits',
  max_entropy: 'Highest section entropy',
  capability_signals: 'Capability signals',
  ioc_density: 'Indicator density',
  extension_mismatch: 'Extension mismatch',
  obfuscation_layers: 'Obfuscation layers',
  autoexec: 'Macro runs on open',
  embedded_executable: 'Embedded executable',
}

export function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? humanise(name)
}

/* ============================================================================
   Indicators
   ========================================================================== */

export interface IocCategory {
  key: string
  label: string
  /**
   * Whether the values are neutered for display. Only the indicators a reader
   * (or a mail client) might follow are defanged: rewriting a registry key, a
   * hash or a path would corrupt the exact string an analyst is about to paste
   * into a search box.
   */
  defang: boolean
}

export const IOC_CATEGORIES: readonly IocCategory[] = [
  { key: 'urls', label: 'URLs', defang: true },
  { key: 'domains', label: 'Domains', defang: true },
  { key: 'ips', label: 'IP addresses', defang: true },
  { key: 'emails', label: 'Email addresses', defang: true },
  { key: 'hashes', label: 'Hashes', defang: false },
  { key: 'file_paths', label: 'File paths', defang: false },
  { key: 'registry_keys', label: 'Registry keys', defang: false },
  { key: 'mutexes', label: 'Mutexes', defang: false },
] as const

/* ============================================================================
   Downloads
   ========================================================================== */

/**
 * Saves an already-fetched blob.
 *
 * The export routes are behind the same bearer token as everything else, so
 * `window.open` on them would 401 — the blob has to be fetched by the API
 * client first and handed to the browser from memory.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking immediately can race the download in Safari; one tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A filesystem-safe stem for an exported report. */
export function exportStem(job: Pick<SandboxJobSummary, 'original_name' | 'public_id'>): string {
  const cleaned = (job.original_name || '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60)
  return `zorbox-${cleaned || job.public_id}`
}
