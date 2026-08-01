/**
 * Where the risk concentrates.
 *
 * The one thing this page must not do is imply a history it does not have.
 * `/api/departments` returns a current roll-up per department and no series, so
 * there is no measured "average risk last month" to compare against. What can
 * honestly be shown is the change the recent risk-event tail made to each
 * department's average — a small, explicitly sized window — and the
 * organisation-wide trend, which the dashboard does measure. Both say which one
 * they are.
 */

import { Building2 } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DepartmentRiskHeatmap, RiskMovementChart, RiskTrendChart } from '../components/charts'
import { HonestMetric, InsufficientDataState } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonChart } from '../components/states'
import { Panel } from '../components/ui'
import { DepartmentTable } from '../features/people/DepartmentTable'
import { attributeRecentEvents } from '../features/people/movement'
import { PeopleHeader } from '../features/people/PeopleHeader'
import { mean } from '../features/people/riskModel'
import { useAnalystDashboard, useDepartments, useEmployees } from '../lib/api/queries'

export default function Departments() {
  const navigate = useNavigate()
  const departments = useDepartments()
  const employees = useEmployees()
  const dashboard = useAnalystDashboard()

  const attribution = useMemo(
    () => attributeRecentEvents(employees.data, departments.data, dashboard.data?.recent_events),
    [employees.data, departments.data, dashboard.data],
  )

  const rows = departments.data ?? []
  const headcount = rows.reduce((sum, department) => sum + department.employee_count, 0)
  const highRisk = rows.reduce((sum, department) => sum + department.high_risk_count, 0)
  // Averaging the department averages would weight a two-person team the same as
  // a forty-person one, so the organisation figure comes from the scored people.
  const orgAverage = mean((employees.data ?? []).map((person) => person.current_risk_score))

  const movementRows = rows
    .filter((department) => attribution.byDepartment.has(department.id))
    .map((department) => ({
      department: department.name,
      delta: attribution.byDepartment.get(department.id) ?? 0,
    }))

  return (
    <div className="space-y-6">
      <PeopleHeader
        title="Departments"
        lead="The same risk model, rolled up to the teams that carry it. Departed staff are excluded from every average, so a department is not credited for people who left."
      />

      <AsyncBoundary
        isLoading={departments.isLoading}
        error={departments.data ? null : departments.error}
        onRetry={() => void departments.refetch()}
        loadingLabel="Loading department risk"
        skeleton={
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonCard metric lines={1} />
            <SkeletonCard metric lines={1} />
            <SkeletonCard metric lines={1} />
          </div>
        }
        isEmpty={rows.length === 0}
        empty={
          <EmptyState
            icon={Building2}
            headline="No department has a scored population"
            description="Departments appear here once they contain at least one employee who has not left. Import an organisation, or seed the demonstration one, and the roll-ups follow."
          />
        }
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel>
              <HonestMetric
                label="Average risk across the organisation"
                value={orgAverage}
                format="score"
                sample={employees.data?.length ?? 0}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="no employee has a score yet"
                definition={{
                  calculation: 'The mean current risk score of every person on the roster.',
                  includes: ['Everyone the employees endpoint returns'],
                  excludes: ['Nothing — this is the whole roster, not a trailing window'],
                  caveat:
                    'Computed from the roster in the browser, so every person counts once. The department averages below come from the server and exclude people who have left.',
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label="People in a scored department"
                value={headcount}
                format="number"
                sample={rows.length}
                sampleNoun="departments"
                source="live"
                unmeasuredReason="no department reported a headcount"
              />
            </Panel>

            <Panel>
              <HonestMetric
                label="People in the high-risk band"
                value={highRisk}
                format="number"
                sample={headcount}
                sampleNoun="people in a scored department"
                tone={highRisk > 0 ? 'critical' : 'neutral'}
                source="live"
                hint="High risk is a score of 60 or above."
                unmeasuredReason="no department reported a high-risk count"
              />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DepartmentRiskHeatmap
              departments={rows}
              onSelect={(department) => navigate(`/employees?department=${department.id}`)}
            />

            {movementRows.length > 0 ? (
              <div className="space-y-2">
                <RiskMovementChart data={movementRows} />
                <p className="text-xs text-fg-subtle">
                  Derived from the {attribution.attributed} most recent risk events the platform could
                  attribute to a named person, divided by each department’s headcount. It is not a
                  month-over-month comparison — no per-department history is stored.
                  {attribution.unattributed > 0
                    ? ` ${attribution.unattributed} further event${attribution.unattributed === 1 ? '' : 's'} could not be placed on exactly one person and ${attribution.unattributed === 1 ? 'was' : 'were'} left out.`
                    : ''}
                </p>
              </div>
            ) : (
              <InsufficientDataState
                title="No department movement to show"
                reason="No per-department history is stored: the departments endpoint returns a current roll-up only, and no recent risk event could be attributed to a person in a department."
                remedy="Movement appears as soon as the risk engine records events — a completed module, a simulation outcome, a report."
                sample={attribution.attributed}
                sampleNoun="attributed risk events"
              />
            )}
          </div>

          <Panel
            title="Every department"
            subtitle="Worst first. Open a roster to see the individuals behind the average."
            flush
          >
            <DepartmentTable
              departments={rows}
              movement={attribution.byDepartment}
              movementSample={attribution.attributed}
            />
          </Panel>

          <AsyncBoundary
            isLoading={dashboard.isLoading}
            error={dashboard.data ? null : dashboard.error}
            onRetry={() => void dashboard.refetch()}
            loadingLabel="Loading the organisation trend"
            skeleton={<SkeletonChart height={240} />}
          >
            <RiskTrendChart
              points={dashboard.data?.trend ?? []}
              windowDays={dashboard.data?.metrics.window_days}
            />
          </AsyncBoundary>
        </div>
      </AsyncBoundary>
    </div>
  )
}
