/**
 * The filter bar over the incident-risk list.
 *
 * The search box holds its own value and pushes to the URL after a pause. Every
 * keystroke writing a history entry and a request would make the back button
 * useless and the list flicker; a filter that lags the typing by a third of a
 * second is what everyone expects a search box to do.
 */

import { useT } from '../../lib/i18n'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { useDepartments } from '../../lib/api/queries'
import {
  ANY_RISK_TYPE_OPTIONS,
  ANY_SEVERITY_OPTIONS,
  ANY_STATUS_OPTIONS,
} from './vocabulary'
import type { RiskFilterState } from './useRiskFilters'

export interface IncidentRiskFiltersProps {
  state: RiskFilterState
}

export function IncidentRiskFilters({ state }: IncidentRiskFiltersProps) {
  const t = useT()
  const { filters, set, reset, activeCount } = state
  const departments = useDepartments()
  const [search, setSearch] = useState(filters.q)

  // The URL is the source of truth: a reset, a back navigation or a shared link
  // has to be reflected in the box the user is looking at.
  useEffect(() => setSearch(filters.q), [filters.q])

  useEffect(() => {
    if (search === filters.q) return
    const timer = setTimeout(() => set({ q: search }), 300)
    return () => clearTimeout(timer)
  }, [search, filters.q, set])

  const departmentOptions = [
    { value: 'all', label: t('u.any-department-2') },
    ...(departments.data ?? []).map((department) => ({
      value: String(department.id),
      label: department.name,
    })),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        label={t('u.search')}
        labelHidden
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('p.search-titles-references-and-descriptions')}
        className="min-w-56 flex-1"
        autoComplete="off"
      />
      <Select
        label={t('u.status')}
        labelHidden
        options={ANY_STATUS_OPTIONS}
        value={filters.status}
        onValueChange={(value) => set({ status: value })}
        className="w-40"
      />
      <Select
        label={t('u.severity')}
        labelHidden
        options={ANY_SEVERITY_OPTIONS}
        value={filters.severity}
        onValueChange={(value) => set({ severity: value })}
        className="w-36"
      />
      <Select
        label={t('u.risk-type')}
        labelHidden
        options={ANY_RISK_TYPE_OPTIONS}
        value={filters.risk_type}
        onValueChange={(value) => set({ risk_type: value })}
        className="w-48"
      />
      <Select
        label={t('u.department')}
        labelHidden
        options={departmentOptions}
        value={filters.department_id}
        onValueChange={(value) => set({ department_id: value })}
        disabled={departments.isLoading}
        className="w-48"
      />
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" icon={<X size={14} aria-hidden="true" />} onClick={reset}>
          Clear {activeCount}
        </Button>
      )}
    </div>
  )
}
