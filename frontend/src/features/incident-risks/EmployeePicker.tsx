/**
 * Choosing the people an incident names.
 *
 * This is the one control in the feature where a mistake has a person's name
 * on it, so it does three things a generic multi-select does not: it searches
 * the real employee directory rather than a cached page, it shows each
 * candidate's department and current risk score so the analyst can tell two
 * people with similar names apart, and it keeps the chosen set visible as
 * removable chips even after the search box is cleared — a selection you can
 * no longer see is a selection you cannot check before submitting.
 */

import { useT } from '../../lib/i18n'
import { Search, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, SkeletonRow } from '../../components/states'
import { Badge, Checkbox, Input, ScrollArea } from '../../components/ui'
import { useDepartments, useEmployees } from '../../lib/api/queries'
import { cn, num, riskBandLabel } from '../../lib/format'
import type { Employee } from '../../domain/types'

export interface EmployeePickerProps {
  /** Employee ids currently chosen. */
  value: number[]
  onChange: (next: number[]) => void
  /** Ids already attached to the risk — offered, but marked and not removable. */
  alreadyAttached?: number[]
  label?: string
  hint?: string
  /** Caps the visible candidate list; the search narrows beyond it. */
  maxVisible?: number
  className?: string
}

export function EmployeePicker({
  value,
  onChange,
  alreadyAttached = [],
  label = 'Affected employees',
  hint,
  maxVisible = 60,
  className,
}: EmployeePickerProps) {
  const t = useT()
  const [query, setQuery] = useState('')
  const employees = useEmployees({})
  const departments = useDepartments()

  const departmentName = useMemo(() => {
    const table = new Map<number, string>()
    for (const department of departments.data ?? []) table.set(department.id, department.name)
    return table
  }, [departments.data])

  // The `?? []` has to be memoised, not inlined: a fresh empty array on every
  // render invalidates every memo below it and re-filters the directory on each
  // keystroke.
  const all = useMemo(() => employees.data ?? [], [employees.data])
  const attached = useMemo(() => new Set(alreadyAttached), [alreadyAttached])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const pool = needle
      ? all.filter(
          (employee) =>
            employee.name.toLowerCase().includes(needle) ||
            employee.email.toLowerCase().includes(needle) ||
            employee.role_title.toLowerCase().includes(needle),
        )
      : all
    return pool.slice(0, maxVisible)
  }, [all, query, maxVisible])

  const chosen = useMemo(
    () => value.map((id) => all.find((employee) => employee.id === id)).filter(Boolean) as Employee[],
    [value, all],
  )

  const toggle = (id: number, checked: boolean) => {
    if (attached.has(id)) return
    onChange(checked ? [...new Set([...value, id])] : value.filter((existing) => existing !== id))
  }

  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-3 border-0 p-0', className)}>
      <legend className="text-sm font-medium text-fg-muted">{label}</legend>
      {hint && <p className="-mt-1 text-xs text-fg-faint">{hint}</p>}

      <Input
        label={t('p.search-the-directory')}
        labelHidden
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('p.search-by-name-email-or-role')}
        type="search"
        autoComplete="off"
      />

      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${chosen.length} selected`}>
          {chosen.map((employee) => (
            <li key={employee.id}>
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-brand/35 bg-brand/12 py-0.5 pl-2 pr-1 text-sm text-brand">
                {employee.name}
                <button
                  type="button"
                  onClick={() => toggle(employee.id, false)}
                  aria-label={`Remove ${employee.name}`}
                  className="rounded-chip p-0.5 text-brand/80 transition-colors hover:bg-brand/20 hover:text-brand"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-control border border-line bg-base">
        {employees.error && !employees.data ? (
          <ErrorState error={employees.error} compact onRetry={() => void employees.refetch()} />
        ) : employees.isLoading ? (
          <div aria-busy="true" role="status">
            <span className="sr-only">Loading the employee directory</span>
            {[0, 1, 2, 3].map((row) => (
              <SkeletonRow key={row} leading={false} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            compact
            icon={query ? Search : UserPlus}
            headline={query ? 'Nobody matches that' : t('p.the-directory-is-empty')}
            description={
              query
                ? t('p.no-employee-in-the-directory-matches')
                : t('p.employees-appear-here-once-the-organisation')
            }
          />
        ) : (
          <ScrollArea viewportClassName="max-h-64">
            <ul className="divide-line">
              {matches.map((employee) => {
                const isAttached = attached.has(employee.id)
                return (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between gap-3 border-b border-line-subtle px-3 py-2 last:border-b-0"
                  >
                    <Checkbox
                      checked={isAttached || value.includes(employee.id)}
                      disabled={isAttached}
                      onCheckedChange={(checked) => toggle(employee.id, checked)}
                      label={
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-body text-fg">{employee.name}</span>
                          <span className="truncate text-xs text-fg-subtle">
                            {employee.role_title}
                            {' · '}
                            {departmentName.get(employee.department_id) ?? 'Department unknown'}
                          </span>
                        </span>
                      }
                    />
                    <span className="flex shrink-0 items-center gap-2">
                      {isAttached && (
                        <Badge size="sm" tone="neutral">
                          Already attached
                        </Badge>
                      )}
                      <span
                        className="text-xs tabular-nums text-fg-subtle"
                        title={riskBandLabel(employee.current_risk_score)}
                      >
                        Risk {num(employee.current_risk_score)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

      <p className="text-xs text-fg-faint" aria-live="polite">
        {value.length === 0
          ? 'Nobody selected yet.'
          : `${value.length} ${value.length === 1 ? 'person' : 'people'} selected.`}
        {all.length > matches.length && !query
          ? ` Showing the first ${matches.length} of ${all.length} — search to narrow.`
          : ''}
      </p>
    </fieldset>
  )
}
