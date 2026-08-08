/**
 * The findings queue's filter bar.
 *
 * Every one of these filters is applied server-side, by the same names the API
 * uses, so the count under the table is a real count and not a client-side
 * slice of one page. Two consequences the UI has to respect:
 *
 * - The technology, source and owner lists are built from the findings this
 *   deployment holds rather than from a hard-coded enum. Offering "Estate scan"
 *   on a deployment that has never run one is a filter that always returns
 *   nothing, which reads as a broken screen.
 * - The due-date filter is a preset that resolves to a **date**, not a
 *   timestamp. `due_before=<now>` would produce a new query key on every render.
 */

import { useT } from '../../lib/i18n'
import { X } from 'lucide-react'
import { Select } from '../../components/ui'
import { Button } from '../../components/ui'
import type { DepartmentRisk, Policy } from '../../domain/types'
import { ANY_VALUE, type UrlFilters } from './useUrlFilters'
import {
  FINDING_STATUS_LABELS,
  SEVERITY_LABELS,
  SOURCE_PREFIX_LABELS,
  optionsFrom,
  optionsFromValues,
  type FindingFilterKey,
} from './vocabulary'

const SEVERITY_OPTIONS = optionsFrom(SEVERITY_LABELS, 'Any severity')
const STATUS_OPTIONS = optionsFrom(FINDING_STATUS_LABELS, 'Any status')

const DUE_OPTIONS = [
  { value: ANY_VALUE, label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: '7d', label: 'Due within 7 days' },
  { value: '30d', label: 'Due within 30 days' },
]

export interface FindingFiltersProps {
  filters: UrlFilters<FindingFilterKey>
  policies: Policy[]
  departments: DepartmentRisk[]
  /** Distinct technologies present across this deployment's findings. */
  technologies: string[]
  /** Distinct `source` prefixes present. The API filters on prefix. */
  sources: string[]
  /** Distinct owner names present. */
  owners: string[]
}

export function FindingFilters({
  filters,
  policies,
  departments,
  technologies,
  sources,
  owners,
}: FindingFiltersProps) {
  const t = useT()
  const policyOptions = [
    { value: ANY_VALUE, label: 'Any policy' },
    ...policies.map((policy) => ({ value: String(policy.id), label: policy.name })),
  ]
  const departmentOptions = [
    { value: ANY_VALUE, label: 'Any department' },
    ...departments.map((department) => ({
      value: String(department.id),
      label: department.name,
    })),
  ]
  const sourceOptions = [
    { value: ANY_VALUE, label: 'Any source' },
    ...sources.map((prefix) => ({
      value: prefix,
      label: SOURCE_PREFIX_LABELS[prefix] ?? prefix,
    })),
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Severity"
          options={SEVERITY_OPTIONS}
          value={filters.values.severity || ANY_VALUE}
          onValueChange={(value) => filters.set('severity', value)}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.values.status || ANY_VALUE}
          onValueChange={(value) => filters.set('status', value)}
        />
        <Select
          label="Policy"
          options={policyOptions}
          value={filters.values.policy || ANY_VALUE}
          onValueChange={(value) => filters.set('policy', value)}
        />
        <Select
          label="Department"
          options={departmentOptions}
          value={filters.values.department || ANY_VALUE}
          onValueChange={(value) => filters.set('department', value)}
          hint={t('p.runs-over-the-most-recent-findings')}
        />
        <Select
          label="Technology"
          options={optionsFromValues(technologies, 'Any technology')}
          value={filters.values.technology || ANY_VALUE}
          onValueChange={(value) => filters.set('technology', value)}
        />
        <Select
          label="Source"
          options={sourceOptions}
          value={filters.values.source || ANY_VALUE}
          onValueChange={(value) => filters.set('source', value)}
        />
        <Select
          label="Owner"
          options={optionsFromValues(owners, 'Any owner')}
          value={filters.values.owner || ANY_VALUE}
          onValueChange={(value) => filters.set('owner', value)}
        />
        <Select
          label={t('u.due-date')}
          options={DUE_OPTIONS}
          value={filters.values.due || ANY_VALUE}
          onValueChange={(value) => filters.set('due', value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-subtle">
          {filters.activeCount === 0
            ? t('p.no-filters-applied-every-finding-this')
            : `${filters.activeCount} filter${filters.activeCount === 1 ? '' : 's'} applied, all of them server-side.`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          icon={<X className="size-4" />}
          onClick={filters.clear}
          disabled={filters.activeCount === 0}
        >
          {t('u.clear-filters-2')}
        </Button>
      </div>
    </div>
  )
}
