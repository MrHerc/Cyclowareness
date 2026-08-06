/**
 * The feed's filter bar.
 *
 * Every control writes to the URL, which is what makes "the four unassessed
 * CISA advisories" a thing an analyst can send to a colleague. The search box
 * commits on submit rather than on each keystroke: a query per character turns
 * a shared demo network into the slowest part of the product, and the API
 * filters on the server anyway.
 */

import { useT } from '../../lib/i18n'
import { Search, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Select } from '../../components/ui'
import {
  ANY,
  RELEVANCE_OPTIONS,
  SEVERITY_OPTIONS,
  SOURCE_OPTIONS,
  TYPE_OPTIONS,
} from './vocabulary'

export interface IntelFilterValues {
  source: string
  type: string
  severity: string
  relevance: string
  q: string
}

export interface IntelFiltersProps {
  values: IntelFilterValues
  onChange: (key: keyof IntelFilterValues, value: string) => void
  onClear: () => void
  /** Row count for the current filters, announced beside the controls. */
  resultLabel: string
}

export function IntelFilters({ values, onChange, onClear, resultLabel }: IntelFiltersProps) {
  const t = useT()
  const [term, setTerm] = useState(values.q)

  // The URL is the source of truth: a back navigation, a shared link or the
  // clear button all change `values.q` without going through this input.
  useEffect(() => setTerm(values.q), [values.q])

  const active =
    Boolean(values.source || values.type || values.severity || values.relevance || values.q)

  function submit(event: FormEvent) {
    event.preventDefault()
    onChange('q', term.trim())
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Source"
          options={SOURCE_OPTIONS}
          value={values.source || ANY}
          onValueChange={(value) => onChange('source', value === ANY ? '' : value)}
        />
        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={values.type || ANY}
          onValueChange={(value) => onChange('type', value === ANY ? '' : value)}
        />
        <Select
          label="Severity"
          options={SEVERITY_OPTIONS}
          value={values.severity || ANY}
          onValueChange={(value) => onChange('severity', value === ANY ? '' : value)}
        />
        <Select
          label="Assessment"
          options={RELEVANCE_OPTIONS}
          value={values.relevance || ANY}
          onValueChange={(value) => onChange('relevance', value === ANY ? '' : value)}
        />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <Input
          label="Search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t('p.cve-id-title-or-summary')}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" icon={<Search className="size-4" aria-hidden="true" />}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-subtle" aria-live="polite">
          {resultLabel}
        </p>
        {active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            icon={<X className="size-3.5" aria-hidden="true" />}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}
