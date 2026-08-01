/**
 * Triage filters for the approval queue.
 *
 * Only `sort` reaches the server: `GET /api/approvals` accepts it, and
 * deliberately offers no severity filter because severity is derived from the
 * verdict rather than stored — a server-side filter over it would disagree with
 * the label on the row. Everything else here narrows the rows the server
 * returned, and the queue says so under the table rather than letting a count
 * imply it covers everything waiting.
 *
 * There is no bulk selection, by design. The gate is the control the product's
 * claim rests on, and an interface that lets somebody clear it with one gesture
 * is not a gate.
 */

import { Search } from 'lucide-react'
import { Input, Select } from '../../components/ui'
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

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Any severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const VERDICT_OPTIONS = [
  { value: 'all', label: 'Any verdict' },
  { value: 'malicious', label: 'Malicious' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'benign', label: 'Benign' },
]

const GENERATION_OPTIONS = [
  { value: 'all', label: 'Any author' },
  { value: 'anthropic', label: 'Written by a model' },
  { value: 'mock', label: 'Written by a template' },
  { value: 'none', label: 'No engine recorded' },
]

const SORT_OPTIONS = [
  { value: 'longest_wait', label: 'Longest wait first' },
  { value: 'shortest_wait', label: 'Newest first' },
]

export interface QueueFiltersProps {
  value: QueueFilterState
  onChange: (next: QueueFilterState) => void
}

export function QueueFilters({ value, onChange }: QueueFiltersProps) {
  const set = <K extends keyof QueueFilterState>(key: K, next: QueueFilterState[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative sm:col-span-2 xl:col-span-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-[2.05rem] size-4 text-fg-faint"
        />
        <Input
          label="Search"
          type="search"
          placeholder="Threat or module title"
          value={value.q}
          onChange={(event) => set('q', event.target.value)}
          inputClassName="pl-9"
        />
      </div>

      <Select
        label="Severity"
        options={SEVERITY_OPTIONS}
        value={value.severity}
        onValueChange={(next) => set('severity', next)}
      />
      <Select
        label="Analyzer verdict"
        options={VERDICT_OPTIONS}
        value={value.verdict}
        onValueChange={(next) => set('verdict', next)}
      />
      <Select
        label="Content author"
        options={GENERATION_OPTIONS}
        value={value.generation}
        onValueChange={(next) => set('generation', next)}
      />
      <Select
        label="Order"
        options={SORT_OPTIONS}
        value={value.sort}
        onValueChange={(next) => set('sort', next === 'shortest_wait' ? 'shortest_wait' : 'longest_wait')}
      />
    </div>
  )
}
