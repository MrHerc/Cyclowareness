/**
 * The roster: everyone the risk model has an opinion about.
 *
 * Filtering happens in the browser on purpose. `/api/employees` accepts no
 * query parameters — it returns the whole roster ordered by score — so sending
 * `q` or `department_id` would produce a filter control that silently does
 * nothing. A filter that does not filter is worse than no filter, so the page
 * owns the work and the URL owns the state, which keeps a filtered roster
 * shareable as a link.
 */

import { Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Button, Panel } from '../components/ui'
import type { Employee } from '../domain/types'
import { DepartmentTiles } from '../features/people/DepartmentTiles'
import { EmployeeFilters, type EmployeeFiltersValue } from '../features/people/EmployeeFilters'
import {
  EmployeeTable,
  type EmployeeRow,
  type EmployeeSortKey,
  type SortDirection,
} from '../features/people/EmployeeTable'
import { attributeRecentEvents } from '../features/people/movement'
import { PeopleHeader } from '../features/people/PeopleHeader'
import { netMovement, scoreTrail } from '../features/people/riskModel'
import { useAnalystDashboard, useDepartments, useEmployees } from '../lib/api/queries'
import { riskBand } from '../lib/format'

const SORT_KEYS: EmployeeSortKey[] = ['name', 'department', 'sensitivity', 'score', 'movement']

function readSort(value: string | null): EmployeeSortKey {
  return SORT_KEYS.find((key) => key === value) ?? 'score'
}

export default function Employees() {
  const t = useT()
  const [params, setParams] = useSearchParams()

  const employees = useEmployees()
  const departments = useDepartments()
  const dashboard = useAnalystDashboard()

  const filters: EmployeeFiltersValue = {
    q: params.get('q') ?? '',
    departmentId: params.get('department') ? Number(params.get('department')) : null,
    band: (['high', 'elevated', 'low'] as const).find((band) => band === params.get('band')) ?? 'all',
  }
  const sort = readSort(params.get('sort'))
  const direction: SortDirection = params.get('dir') === 'asc' ? 'asc' : 'desc'

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') merged.delete(key)
      else merged.set(key, value)
    }
    setParams(merged, { replace: true })
  }

  const departmentNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const department of departments.data ?? []) map.set(department.id, department.name)
    return map
  }, [departments.data])

  const attribution = useMemo(
    () => attributeRecentEvents(employees.data, departments.data, dashboard.data?.recent_events),
    [employees.data, departments.data, dashboard.data],
  )

  const rows = useMemo<EmployeeRow[]>(() => {
    const matchesFilters = (person: Employee) => {
      if (filters.departmentId !== null && person.department_id !== filters.departmentId) return false
      if (filters.band !== 'all' && riskBand(person.current_risk_score) !== filters.band) return false
      if (filters.q) {
        const needle = filters.q.toLowerCase()
        const haystack = `${person.name} ${person.email} ${person.role_title}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    }

    return (employees.data ?? []).filter(matchesFilters).map((person) => {
      const events = attribution.byEmployee.get(person.id) ?? []
      return {
        id: person.id,
        name: person.name,
        email: person.email,
        roleTitle: person.role_title,
        roleSensitivity: person.role_sensitivity,
        score: person.current_risk_score,
        departmentName: departmentNames.get(person.department_id) ?? '—',
        status: person.status,
        trail: scoreTrail(person.current_risk_score, events).map((point) => point.score),
        movement: netMovement(events),
      }
    })
  }, [employees.data, attribution, departmentNames, filters.departmentId, filters.band, filters.q])

  const sorted = useMemo(() => {
    const factor = direction === 'asc' ? 1 : -1
    const compare = (a: EmployeeRow, b: EmployeeRow): number => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'department':
          return a.departmentName.localeCompare(b.departmentName) || a.name.localeCompare(b.name)
        case 'sensitivity':
          return a.roleSensitivity - b.roleSensitivity
        case 'movement':
          // People with no recorded movement sort last in either direction:
          // "not measured" is not a small number.
          if (a.movement === null && b.movement === null) return 0
          if (a.movement === null) return factor
          if (b.movement === null) return -factor
          return a.movement - b.movement
        case 'score':
          return a.score - b.score
      }
    }
    return [...rows].sort((a, b) => compare(a, b) * factor)
  }, [rows, sort, direction])

  return (
    <div className="space-y-6">
      <PeopleHeader
        title={t('page.employees.title')}
        lead="Every person the risk engine scores, with the score it currently holds and the movement it has recorded. Open anyone to see the arithmetic behind their number."
        actions={
          <Button asChild variant="secondary">
            <Link to="/risk-profiles">How the score is computed</Link>
          </Button>
        }
      />

      {departments.data && departments.data.length > 0 ? (
        <DepartmentTiles
          departments={departments.data}
          selectedId={filters.departmentId}
          onSelect={(departmentId) =>
            update({ department: departmentId === null ? null : String(departmentId) })
          }
        />
      ) : null}

      <Panel
        title="Roster"
        subtitle="Sorted by risk score by default. Every column header sorts, and every filter is in the URL."
        flush
      >
        <div className="border-b border-line-subtle p-4">
          <EmployeeFilters
            value={filters}
            departments={departments.data ?? []}
            shown={rows.length}
            total={employees.data?.length ?? 0}
            onChange={(next) => {
              // Only the keys the control actually changed. Rewriting all three
              // on every keystroke would clear the other two.
              const patch: Record<string, string | null> = {}
              if (next.q !== undefined) patch.q = next.q
              if (next.departmentId !== undefined) {
                patch.department = next.departmentId === null ? null : String(next.departmentId)
              }
              if (next.band !== undefined) patch.band = next.band === 'all' ? null : next.band
              update(patch)
            }}
            onClear={() => update({ q: null, department: null, band: null })}
          />
        </div>

        <AsyncBoundary
          isLoading={employees.isLoading}
          error={employees.data ? null : employees.error}
          onRetry={() => void employees.refetch()}
          loadingLabel="Loading the roster"
          skeleton={<SkeletonTable rows={8} cols={6} header={false} className="border-0" />}
          isEmpty={sorted.length === 0}
          empty={
            <EmptyState
              icon={Users}
              compact
              headline={
                (employees.data?.length ?? 0) === 0
                  ? 'No people have been loaded'
                  : 'No one matches these filters'
              }
              description={
                (employees.data?.length ?? 0) === 0
                  ? 'The employees endpoint returned an empty roster. People appear here once an organisation is imported or the demonstration organisation is seeded.'
                  : 'Widen the search, choose another department, or clear the risk band to see the rest of the roster.'
              }
              className="m-4"
            />
          }
        >
          <EmployeeTable
            rows={sorted}
            sort={sort}
            direction={direction}
            movementSample={attribution.attributed}
            onSort={(key) =>
              update({
                sort: key,
                dir: sort === key && direction === 'desc' ? 'asc' : 'desc',
              })
            }
          />
        </AsyncBoundary>
      </Panel>
    </div>
  )
}
