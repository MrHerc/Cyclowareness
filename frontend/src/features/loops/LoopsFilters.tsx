/**
 * The filter bar over the run list.
 *
 * Presentation only — it owns no state and fetches nothing. The page holds the
 * filters in the URL so a view can be shared, and the Command Center's
 * click-through (`/loops?stage=4`) lands on a bar that already reflects it.
 */

import { useT } from '../../lib/i18n'
import { Search, X } from 'lucide-react'
import { STAGES } from '../../domain/types'
import { cn } from '../../lib/format'
import { Button, IconButton, Input, Select } from '../../components/ui'
import { STATUS_FILTERS, type StatusFilter } from './filters'

export interface LoopsFiltersProps {
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  stage: number | null
  onStageChange: (stage: number | null) => void
  query: string
  onQueryChange: (query: string) => void
  /** Rows after filtering, and rows the API returned. Both, always. */
  shown: number
  total: number
  onClear: () => void
}

const ALL_STAGES = 'all'

export function LoopsFilters({
  status,
  onStatusChange,
  stage,
  onStageChange,
  query,
  onQueryChange,
  shown,
  total,
  onClear,
}: LoopsFiltersProps) {
  const t = useT()
  const filtered = status !== 'all' || stage !== null || query.trim() !== ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label={t('p.filter-runs-by-status')}
          className="flex flex-wrap items-center gap-1 rounded-control border border-line bg-surface p-1"
        >
          {STATUS_FILTERS.map((option) => {
            const active = option.value === status
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  'rounded-chip px-3 py-1.5 text-sm transition-colors duration-100',
                  active
                    ? 'bg-brand/15 text-brand'
                    : 'text-fg-muted hover:bg-raised hover:text-fg',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <Select
          label="Stage"
          labelHidden
          className="w-52"
          value={stage === null ? ALL_STAGES : String(stage)}
          onValueChange={(value) => onStageChange(value === ALL_STAGES ? null : Number(value))}
          options={[
            { value: ALL_STAGES, label: 'All stages' },
            ...STAGES.map((s) => ({ value: String(s.n), label: `${s.n}. ${s.label}` })),
          ]}
        />

        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint"
          />
          <Input
            label="Search runs"
            labelHidden
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('p.search-by-run-id-threat-type')}
            inputClassName="pl-9"
          />
          {query ? (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <IconButton size="sm" label={t('p.clear-the-search')} onClick={() => onQueryChange('')}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-fg-subtle" aria-live="polite">
          {filtered
            ? `Showing ${shown} of ${total} loaded runs`
            : `${total} run${total === 1 ? '' : 's'}`}
        </p>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}
