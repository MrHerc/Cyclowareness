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

import { useT, type MessageKey } from '../../lib/i18n'
import { Search } from 'lucide-react'
import { Input, Select, type SelectOption } from '../../components/ui'
import { type QueueFilterState } from './filterState'

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Any severity', labelKey: 'u.any-severity' },
  { value: 'critical', label: 'Critical', labelKey: 'u.critical' },
  { value: 'high', label: 'High', labelKey: 'u.high' },
  { value: 'medium', label: 'Medium', labelKey: 'u.medium' },
  { value: 'low', label: 'Low' },
]

const VERDICT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Any verdict', labelKey: 'u.any-verdict' },
  { value: 'malicious', label: 'Malicious', labelKey: 'u.malicious' },
  { value: 'suspicious', label: 'Suspicious', labelKey: 'u.suspicious' },
  { value: 'benign', label: 'Benign', labelKey: 'u.benign' },
]

const GENERATION_OPTIONS: { value: string; label: MessageKey }[] = [
  { value: 'all', label: 'p.any-author' },
  { value: 'anthropic', label: 'p.written-by-a-model' },
  { value: 'mock', label: 'p.written-by-a-template' },
  { value: 'none', label: 'p.no-engine-recorded' },
]

const SORT_OPTIONS: SelectOption[] = [
  { value: 'longest_wait', label: 'Longest wait first', labelKey: 'u.longest-wait-first' },
  { value: 'shortest_wait', label: 'Newest first', labelKey: 'u.newest-first' },
]

export interface QueueFiltersProps {
  value: QueueFilterState
  onChange: (next: QueueFilterState) => void
}

export function QueueFilters({ value, onChange }: QueueFiltersProps) {
  const t = useT()
  const set = <K extends keyof QueueFilterState>(key: K, next: QueueFilterState[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative sm:col-span-2 xl:col-span-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-[2.05rem] size-4 text-fg-faint"
        />
        <Input
          label={t('u.search')}
          type="search"
          placeholder={t('p.threat-or-module-title')}
          value={value.q}
          onChange={(event) => set('q', event.target.value)}
          inputClassName="pl-9"
        />
      </div>

      <Select
        label={t('u.severity')}
        options={SEVERITY_OPTIONS}
        value={value.severity}
        onValueChange={(next) => set('severity', next)}
      />
      <Select
        label={t('p.analyzer-verdict')}
        options={VERDICT_OPTIONS}
        value={value.verdict}
        onValueChange={(next) => set('verdict', next)}
      />
      <Select
        label={t('p.content-author')}
        options={GENERATION_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
        value={value.generation}
        onValueChange={(next) => set('generation', next)}
      />
      <Select
        label={t('u.order')}
        options={SORT_OPTIONS}
        value={value.sort}
        onValueChange={(next) => set('sort', next === 'shortest_wait' ? 'shortest_wait' : 'longest_wait')}
      />
    </div>
  )
}
