/**
 * Narrowing the trail.
 *
 * Every menu here is built from what the deployment actually wrote — the verb
 * list comes from `/api/audit/actions`, the object types from an unfiltered
 * sample of the log itself — so a filter can never offer a value that returns
 * nothing. Actor and free text are handed to the API rather than applied to the
 * rows on screen, which is what keeps the count under the table a statement
 * about the whole store instead of about one page of it.
 */

import { useT } from '../../lib/i18n'
import { Select, Input, Button } from '../../components/ui'
import { DateRangeSelector, type DateRangeValue } from '../../components/data'
import { ANY_VALUE, type UrlFilters } from '../policy/useUrlFilters'
import { humanise, num } from '../../lib/format'
import type { AuditActionCount, AuditFilterKey } from './data'

export interface AuditFiltersProps {
  filters: UrlFilters<AuditFilterKey>
  actions: AuditActionCount[]
  objectTypes: string[]
  range: DateRangeValue
  onRangeChange: (next: DateRangeValue) => void
  limit: number
  onLimitChange: (next: number) => void
}

const LIMITS = [50, 100, 250, 500]

export function AuditFilters({
  filters,
  actions,
  objectTypes,
  range,
  onRangeChange,
  limit,
  onLimitChange,
}: AuditFiltersProps) {
  const t = useT()
  const actionOptions = [
    { value: ANY_VALUE, label: 'Every action' },
    ...actions.map((entry) => ({
      value: entry.action,
      label: entry.count === null ? entry.action : `${entry.action} (${num(entry.count)})`,
    })),
  ]

  const objectOptions = [
    { value: ANY_VALUE, label: 'Every object type' },
    ...objectTypes.map((value) => ({ value, label: humanise(value) })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Search"
          type="search"
          value={filters.values.q}
          onChange={(event) => filters.set('q', event.target.value)}
          placeholder={t('p.summary-object-label-or-action')}
          className="w-64"
        />
        <Input
          label="Actor"
          type="search"
          value={filters.values.actor}
          onChange={(event) => filters.set('actor', event.target.value)}
          placeholder={t('p.part-of-an-email-address')}
          className="w-56"
        />
        <Select
          label="Action"
          options={actionOptions}
          value={filters.values.action || ANY_VALUE}
          onValueChange={(value) => filters.set('action', value)}
          className="w-64"
        />
        <Select
          label={t('u.object-type')}
          options={objectOptions}
          value={filters.values.object_type || ANY_VALUE}
          onValueChange={(value) => filters.set('object_type', value)}
          className="w-52"
        />
        <Select
          label={t('u.page-size')}
          options={LIMITS.map((value) => ({ value: String(value), label: `${num(value)} entries` }))}
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          className="w-40"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeSelector value={range} onChange={onRangeChange} label={t('p.trail-window')} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-faint">
            {filters.activeCount === 0
              ? t('p.no-filter-applied-beyond-the-window')
              : `${num(filters.activeCount)} filter${filters.activeCount === 1 ? '' : 's'} applied`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => filters.clear()}
            disabled={filters.activeCount === 0}
          >
            {t('u.clear-filters-2')}
          </Button>
        </div>
      </div>

      <p className="text-xs text-fg-subtle">
        {t('u.an-action-matches-exactly-or-as')} <span className="tech">incident_risk</span>{' '}
        {t('u.finds-every-verb-beneath-it')}
      </p>
    </div>
  )
}
