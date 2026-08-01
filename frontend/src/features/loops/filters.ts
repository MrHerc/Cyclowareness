/**
 * What the Closed Loops list can be narrowed by, and how.
 *
 * The status filter is a server filter (`GET /api/loop-runs?status=`) while the
 * stage and the free-text query are applied here. That split is deliberate: the
 * server understands `status` and nothing else, and a filter the API cannot
 * honour has to be visibly applied to the rows that came back rather than
 * silently dropped into a query string the backend ignores.
 */

import { STAGES } from '../../domain/types'
import type { RunSummary } from '../../domain/types'

export const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'awaiting_training', label: 'Awaiting training' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const

export type StatusFilter = (typeof STATUS_FILTERS)[number]['value']

export function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUS_FILTERS.some((filter) => filter.value === value)
}

/** `?stage=4` from the Command Center. Anything outside 1–7 is not a stage. */
export function parseStage(value: string | null): number | null {
  if (!value) return null
  const stage = Number(value)
  return STAGES.some((s) => s.n === stage) ? stage : null
}

export function stageLabel(stage: number): string {
  return STAGES.find((s) => s.n === stage)?.label ?? `Stage ${stage}`
}

/**
 * Free text across the fields a row actually shows.
 *
 * Searching hidden fields makes a row appear for a term the reader cannot see
 * anywhere on it, which reads as a bug rather than as a feature.
 */
export function matchesQuery(run: RunSummary, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    String(run.id),
    run.threat_title,
    run.threat_type ?? '',
    run.verdict ?? '',
    run.source ?? '',
    stageLabel(run.current_stage),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function applyFilters(
  runs: readonly RunSummary[],
  { stage, query }: { stage: number | null; query: string },
): RunSummary[] {
  return runs.filter(
    (run) => (stage === null || run.current_stage === stage) && matchesQuery(run, query),
  )
}
