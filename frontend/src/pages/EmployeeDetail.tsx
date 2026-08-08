/**
 * One person, and why the model says what it says about them.
 *
 * The page is arranged so the derivation comes first and the evidence comes
 * second. That order is the argument: a risk score attached to a named human is
 * only defensible if the person it describes could sit down with this screen and
 * check the arithmetic, then read the events that produced it.
 */

import { useT } from '../lib/i18n'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Sparkline } from '../components/charts'
import { AsyncBoundary, SkeletonCard, SkeletonTable } from '../components/states'
import {
  Avatar,
  Panel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui'
import { EmployeeActivity } from '../features/people/EmployeeActivity'
import { EmployeeDepartmentContext } from '../features/people/EmployeeDepartmentContext'
import { EmployeeReports } from '../features/people/EmployeeReports'
import { RiskDerivation } from '../features/people/RiskDerivation'
import { RiskEventTrail } from '../features/people/RiskEventTrail'
import { RiskScore } from '../features/people/RiskScore'
import { baselineFor, behaviourOf, scoreTrail } from '../features/people/riskModel'
import { useDepartments, useEmployee, useReports } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { num, signed } from '../lib/format'

export default function EmployeeDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const employee = useEmployee(id)
  const departments = useDepartments()
  const canOpenLoops = usePermission('loops.view')
  const canReadReports = usePermission('reports.view')
  const reports = useReports(undefined, { enabled: canReadReports })

  const person = employee.data
  const events = person?.recent_events ?? []
  // `scoreTrail` walks BACKWARDS from the current score, subtracting each delta
  // to recover what the score was before it. A withdrawn event's delta is not in
  // the current score — the engine recomputed without it — so unwinding it puts
  // the line somewhere the person was never at, and the caption below would then
  // claim the reconstruction came from the events listed underneath.
  const countedEvents = events.filter((event) => !event.revoked_at)
  const trail = person
    ? scoreTrail(person.current_risk_score, countedEvents).map((point) => point.score)
    : []
  const withdrawnCount = events.length - countedEvents.length
  const theirReports = (reports.data ?? []).filter((report) => report.employee_id === person?.id)

  return (
    <div className="space-y-6">
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('u.back-to-the-roster')}
      </Link>

      <AsyncBoundary
        isLoading={employee.isLoading}
        error={employee.data ? null : employee.error}
        onRetry={() => void employee.refetch()}
        loadingLabel={t('x.loading-this-persons-risk-profile')}
        skeleton={
          <div className="space-y-4">
            <SkeletonCard metric lines={2} />
            <SkeletonTable rows={6} cols={4} />
          </div>
        }
      >
        {person ? (
          <div className="space-y-6">
            <header className="flex flex-wrap items-start gap-4">
              <Avatar name={person.name} size="lg" />
              <div className="min-w-0">
                <h1 className="text-display text-fg">{person.name}</h1>
                <p className="mt-1 text-lead text-fg-muted">
                  {person.role_title} · {person.department_name || 'No department recorded'}
                </p>
                <p className="tech mt-1 text-fg-subtle">{person.email}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="space-y-4">
                <Panel title={t('x.current-risk-score')}>
                  <RiskScore score={person.current_risk_score} bar size="lg" />

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-fg-subtle">{t('u.role-sensitivity')}</dt>
                      <dd className="text-fg tabular-nums">{num(person.role_sensitivity, 1)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-fg-subtle">{t('u.baseline-from-the-role')}</dt>
                      <dd className="text-fg tabular-nums">
                        {num(baselineFor(person.role_sensitivity), 1)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-fg-subtle">{t('u.moved-by-recorded-behaviour')}</dt>
                      <dd className="text-fg tabular-nums">{signed(behaviourOf(person), 1)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-line-subtle pt-3">
                    <p className="label text-fg-subtle">{t('p.score-across-recent-events')}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <Sparkline
                        values={trail}
                        width={140}
                        height={32}
                        color="var(--color-series-3)"
                        label={`${person.name}: risk score across the recorded events`}
                      />
                      <span className="text-xs text-fg-subtle">
                        {trail.length >= 2
                          ? `Reconstructed from the ${trail.length} events below` +
                            (withdrawnCount > 0
                              ? `, excluding ${withdrawnCount} withdrawn`
                              : '')
                          : t('p.two-or-more-events-are-needed')}
                      </span>
                    </div>
                  </div>
                </Panel>

                <Panel title={t('x.department-context')}>
                  <EmployeeDepartmentContext
                    departmentName={person.department_name}
                    department={(departments.data ?? []).find(
                      (department) => department.id === person.department_id,
                    )}
                    score={person.current_risk_score}
                  />
                </Panel>
              </div>

              <Panel
                tone="feature"
                title={t('x.how-this-score-is-derived')}
                subtitle={t('x.baseline-plus-every-recorded-signal')}
                className="xl:col-span-2"
              >
                <RiskDerivation employee={person} />
              </Panel>
            </div>

            <Tabs defaultValue="trail">
              <TabsList>
                <TabsTrigger value="trail">{t('u.event-trail')}</TabsTrigger>
                <TabsTrigger value="activity">{t('u.training-and-simulations')}</TabsTrigger>
                <TabsTrigger value="reports">{t('u.reports-submitted')}</TabsTrigger>
              </TabsList>

              <TabsContent value="trail">
                <Panel
                  title={t('x.every-recorded-event')}
                  subtitle={t('x.newest-first-with-the-delta')}
                  flush
                >
                  <RiskEventTrail events={events} canOpenLoops={canOpenLoops} />
                </Panel>
              </TabsContent>

              <TabsContent value="activity">
                <Panel title={t('x.training-and-simulation-history')}>
                  <EmployeeActivity events={events} />
                </Panel>
              </TabsContent>

              <TabsContent value="reports">
                <Panel title={t('x.reports-submitted')}>
                  {canReadReports ? (
                    <AsyncBoundary
                      isLoading={reports.isLoading}
                      error={reports.data ? null : reports.error}
                      onRetry={() => void reports.refetch()}
                      loadingLabel={t('x.loading-reports')}
                      skeleton={<SkeletonTable rows={3} cols={2} header={false} />}
                    >
                      <EmployeeReports
                        reports={theirReports}
                        name={person.name}
                        canOpenLoops={canOpenLoops}
                        scanned={reports.data?.length ?? 0}
                      />
                    </AsyncBoundary>
                  ) : (
                    <p className="text-sm text-fg-subtle">{t('p.your-role-cannot-read-the-report')}</p>
                  )}
                </Panel>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  )
}
