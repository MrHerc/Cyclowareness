/**
 * The library's filter bar.
 *
 * Search is a form rather than a keystroke-by-keystroke query: every character
 * typed into a live-filtering box is a request, a re-render and a new entry in
 * the query cache, and a governance table is not a search-as-you-type surface.
 * Enter submits, and the button says so.
 *
 * Every control writes to the URL, so a filtered library is a link.
 */

import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Input, Select } from '../../components/ui'
import type { DepartmentRisk } from '../../domain/types'
import { ANY_VALUE, type UrlFilters } from './useUrlFilters'
import { POLICY_STATUS_LABELS, POLICY_TYPE_LABELS, optionsFrom } from './vocabulary'

export type PolicyFilterKey = 'q' | 'type' | 'status' | 'department'

const TYPE_OPTIONS = optionsFrom(POLICY_TYPE_LABELS, 'Any type')
const STATUS_OPTIONS = optionsFrom(POLICY_STATUS_LABELS, 'Any status')

export interface PolicyFiltersProps {
  filters: UrlFilters<PolicyFilterKey>
  departments: DepartmentRisk[]
}

export function PolicyFilters({ filters, departments }: PolicyFiltersProps) {
  const [term, setTerm] = useState(filters.values.q)

  // Keep the box in step when the URL changes underneath it — a cleared filter
  // set has to clear the box too.
  useEffect(() => {
    setTerm(filters.values.q)
  }, [filters.values.q])

  const departmentOptions = [
    { value: ANY_VALUE, label: 'Any department' },
    ...departments.map((department) => ({
      value: String(department.id),
      label: department.name,
    })),
  ]

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        filters.set('q', term.trim())
      }}
    >
      <div className="flex items-end gap-2">
        <Input
          label="Search"
          hint="Name, owner or notes. Press Enter to search."
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Approved software…"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" icon={<Search className="size-4" />}>
          Search
        </Button>
      </div>

      <Select
        label="Type"
        options={TYPE_OPTIONS}
        value={filters.values.type || ANY_VALUE}
        onValueChange={(value) => filters.set('type', value)}
      />
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={filters.values.status || ANY_VALUE}
        onValueChange={(value) => filters.set('status', value)}
      />
      <Select
        label="Department"
        options={departmentOptions}
        value={filters.values.department || ANY_VALUE}
        onValueChange={(value) => filters.set('department', value)}
      />

      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          icon={<X className="size-4" />}
          onClick={() => {
            setTerm('')
            filters.clear()
          }}
          disabled={filters.activeCount === 0}
        >
          Clear
        </Button>
      </div>
    </form>
  )
}
