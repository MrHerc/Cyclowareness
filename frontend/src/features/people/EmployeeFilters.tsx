/**
 * The filter strip above the roster.
 *
 * Every control here is wired to a URL search param by the page, so a filtered
 * roster is a link an analyst can paste into a ticket. That is also why the
 * clear control is a real button and not a reset of local state — there is no
 * local state to reset.
 */

import { useT } from '../../lib/i18n'
import { X } from 'lucide-react'
import type { DepartmentRisk } from '../../domain/types'
import { Button, Input, Select } from '../../components/ui'

export interface EmployeeFiltersValue {
  q: string
  departmentId: number | null
  band: 'all' | 'high' | 'elevated' | 'low'
}

export interface EmployeeFiltersProps {
  value: EmployeeFiltersValue
  departments: DepartmentRisk[]
  onChange: (next: Partial<EmployeeFiltersValue>) => void
  onClear: () => void
  /** How many rows survived the filters, and out of how many. */
  shown: number
  total: number
}

const BAND_OPTIONS = [
  { value: 'all', label: 'Any risk band' },
  { value: 'high', label: 'High risk (60–100)' },
  { value: 'elevated', label: 'Elevated (40–59)' },
  { value: 'low', label: 'Low risk (0–39)' },
]

export function EmployeeFilters({
  value,
  departments,
  onChange,
  onClear,
  shown,
  total,
}: EmployeeFiltersProps) {
  const t = useT()
  const active = value.q !== '' || value.departmentId !== null || value.band !== 'all'

  const departmentOptions = [
    { value: 'all', label: 'All departments' },
    ...departments.map((department) => ({
      value: String(department.id),
      label: department.name,
    })),
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        label={t('p.search-people')}
        labelHidden
        type="search"
        placeholder={t('p.search-name-email-or-role')}
        value={value.q}
        onChange={(event) => onChange({ q: event.target.value })}
        className="min-w-56 flex-1"
      />

      <Select
        label="Department"
        labelHidden
        options={departmentOptions}
        value={value.departmentId === null ? 'all' : String(value.departmentId)}
        onValueChange={(next) => onChange({ departmentId: next === 'all' ? null : Number(next) })}
        className="w-48"
      />

      <Select
        label="Risk band"
        labelHidden
        options={BAND_OPTIONS}
        value={value.band}
        onValueChange={(next) => onChange({ band: next as EmployeeFiltersValue['band'] })}
        className="w-48"
      />

      {active ? (
        <Button variant="ghost" icon={<X className="size-4" aria-hidden="true" />} onClick={onClear}>
          Clear filters
        </Button>
      ) : null}

      <p className="ml-auto text-sm text-fg-subtle" aria-live="polite">
        {shown === total ? `${total} people` : `${shown} of ${total} people`}
      </p>
    </div>
  )
}
