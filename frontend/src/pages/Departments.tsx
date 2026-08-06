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
import { useT } from '../lib/i18n'
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
  const t = useT()
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
        title={t('page.departments.title')}
        lead={t('page.departments.lead')}
      />

      <AsyncBoundary
        isLoading={departments.isLoading}
        error={departments.data ? null : departments.error}
        onRetry={() => void departments.refetch()}
        loadingLabel={t('x.loading-department-risk')}
        skeleton={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            description={t('x.departments-appear-here-once-they-2')}
          />
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel>
              <HonestMetric
                label={t('p.average-risk-across-the-organisation')}
                value={orgAverage}
                format="score"
                sample={employees.data?.length ?? 0}
                sampleNoun="scored people"
                source="live"
                unmeasuredReason="no employee has a score yet"
                definition={{
                  calculation: t('p.the-mean-current-risk-score-of'),
                  includes: ['Everyone the employees endpoint returns'],
                  excludes: ['Nothing — this is the whole roster, not a trailing window'],
                  caveat:
                    t('p.computed-from-the-roster-in-the'),
                }}
              />
            </Panel>

            <Panel>
              <HonestMetric
                label={t('p.people-in-a-scored-department')}
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
                label={t('p.people-in-the-highrisk-band')}
                value={highRisk}
                format="number"
                sample={headcount}
                sampleNoun="people in a scored department"
                tone={highRisk > 0 ? 'critical' : 'neutral'}
                source="live"
                hint={t('p.high-risk-is-a-score-of')}
                unmeasuredReason="no department reported a high-risk count"
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DepartmentRiskHeatmap headingLevel={2}
              departments={rows}
              onSelect={(department) => navigate(`/employees?department=${department.id}`)}
            />

            {movementRows.length > 0 ? (
              <div className="space-y-2">
                {/* Same level as the heatmap beside it. At h3 against the
                    heatmap's h2 it read as a child of it. */}
                <RiskMovementChart headingLevel={2} data={movementRows} />
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
                title={t('x.no-department-movement-to-show')}
                reason={t('p.no-perdepartment-history-is-stored-the')}
                remedy="Movement appears as soon as the risk engine records events — a completed module, a simulation outcome, a report."
                sample={attribution.attributed}
                sampleNoun="attributed risk events"
              />
            )}
          </div>

          <Panel
            title={t('x.every-department')}
            subtitle={t('x.worst-first-open-a-roster')}
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
            loadingLabel={t('x.loading-the-organisation-trend')}
            skeleton={<SkeletonChart height={240} />}
          >
            <RiskTrendChart headingLevel={2}
              points={dashboard.data?.trend ?? []}
              windowDays={dashboard.data?.metrics.window_days}
            />
          </AsyncBoundary>
        </div>
      </AsyncBoundary>
    </div>
  )
}
