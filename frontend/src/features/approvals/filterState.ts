/**
 * The queue's filter state, its URL encoding, and the predicate that applies it.
 *
 * Apart from the control that renders it because Fast Refresh only works when
 * a module exports components alone — a file that also exports a constant or a
 * helper falls back to a full reload on every edit.
 */

import type { QueueRow } from './contract'

export type QueueSort = 'longest_wait' | 'shortest_wait'

export interface QueueFilterState {
  q: string
  severity: string
  verdict: string
  generation: string
  sort: QueueSort
}

export const DEFAULT_FILTERS: QueueFilterState = {
  q: '',
  severity: 'all',
  verdict: 'all',
  generation: 'all',
  sort: 'longest_wait',
}

export function filtersFromParams(params: URLSearchParams): QueueFilterState {
  const sort = params.get('sort')
  return {
    q: params.get('q') ?? '',
    severity: params.get('severity') ?? 'all',
    verdict: params.get('verdict') ?? 'all',
    generation: params.get('generation') ?? 'all',
    sort: sort === 'shortest_wait' ? 'shortest_wait' : 'longest_wait',
  }
}

/** Only non-default values are written, so a shared URL stays readable. */
export function paramsFromFilters(filters: QueueFilterState): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of ['q', 'severity', 'verdict', 'generation', 'sort'] as const) {
    if (filters[key] !== DEFAULT_FILTERS[key]) params.set(key, filters[key])
  }
  return params
}

export function isFiltered(filters: QueueFilterState): boolean {
  return (
    filters.q !== DEFAULT_FILTERS.q ||
    filters.severity !== DEFAULT_FILTERS.severity ||
    filters.verdict !== DEFAULT_FILTERS.verdict ||
    filters.generation !== DEFAULT_FILTERS.generation
  )
}

/**
 * `generation: 'none'` selects modules with no engine on record — the
 * population most worth looking at, and the reason the filter is not a boolean.
 */
export function filterRows(rows: QueueRow[], filters: QueueFilterState): QueueRow[] {
  const needle = filters.q.trim().toLowerCase()
  const matched = rows.filter((row) => {
    if (filters.severity !== 'all' && row.severity !== filters.severity) return false
    if (filters.verdict !== 'all' && row.verdict !== filters.verdict) return false
    if (filters.generation === 'none' && row.generationSource !== '') return false
    if (filters.generation !== 'all' && filters.generation !== 'none') {
      if (row.generationSource !== filters.generation) return false
    }
    if (needle) {
      const haystack = `${row.threatTitle} ${row.moduleTitle ?? ''} ${row.threatType ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  // Sorted here as well as on the server so the order is right whichever page
  // the server returned and whichever filters removed rows from it.
  return matched.sort((a, b) =>
    filters.sort === 'longest_wait'
      ? b.waitingSeconds - a.waitingSeconds
      : a.waitingSeconds - b.waitingSeconds,
  )
}
