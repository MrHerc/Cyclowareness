/**
 * My Security — the employee's whole view of the product.
 *
 * The order of this page is the argument it makes. The training waiting on this
 * person comes first, then the work incident response raised against them, then
 * the score and the evidence behind it, then the record, and only at the very
 * bottom the points and badges. An employee portal that opens with a streak
 * counter is a game with a security theme; this one opens with the one thing
 * somebody is actually being asked to do.
 *
 * Every panel below the first resolves its own failure. A dashboard poll that
 * blips must not take the assignment card off the screen.
 */

import { useMemo, useState } from 'react'
import { CircleCheck, Flag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DemoDataBadge } from '../components/data'
import { AsyncBoundary, EmptyState, ErrorState, SkeletonCard } from '../components/states'
import { Badge, Button, Panel } from '../components/ui'
import type { AssignmentDetail } from '../domain/types'
import { CurrentAssignmentCard } from '../features/portal/CurrentAssignmentCard'
import { IncidentObligations } from '../features/portal/IncidentObligations'
import { isIncidentWorkOpen } from '../features/portal/incidentWork'
import { Recognition } from '../features/portal/Recognition'
import { ReportHistory } from '../features/portal/ReportHistory'
import { ReportSuspiciousDialog } from '../features/portal/ReportSuspiciousDialog'
import { RiskScorePanel } from '../features/portal/RiskScorePanel'
import { TrainingHistory } from '../features/portal/TrainingHistory'
import { buildRiskEvidence } from '../features/portal/riskNarrative'
import {
  useCapabilities,
  useEmployeeDashboard,
  useMyAssignments,
  useMyIncidentRisks,
  useMyProfile,
  useMyReports,
} from '../lib/api/queries'
import { backingFor } from '../lib/demo/registry'
import { formatDate } from '../lib/format'

const OPEN_STATUSES = new Set(['assigned', 'in_progress'])

/** Same shape as the loaded page: one feature card, then two stacked panels. */
function PortalSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard metric lines={4} />
      <SkeletonCard lines={3} />
      <SkeletonCard metric lines={3} />
    </div>
  )
}

export default function Portal() {
  const dashboard = useEmployeeDashboard()
  const assignments = useMyAssignments()
  const profile = useMyProfile()
  const incidents = useMyIncidentRisks()
  const reports = useMyReports()
  const capabilities = useCapabilities()
  const [reportOpen, setReportOpen] = useState(false)

  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  const incidentList = useMemo(() => incidents.data ?? [], [incidents.data])

  /** Assignment id -> the incident risk that forced it, for deadline and pass mark.
   *
   * EMPTY, and honestly so. `/api/incident-risks/my` does not carry an
   * assignment id, so there is nothing to key on. The previous version read
   * `item.assignment_id`, which was always `undefined`, so every entry was
   * skipped — the map was already empty, it just looked like it was not.
   * Kept as the seam for when the endpoint does carry one. */
  const incidentByAssignment = useMemo(
    () => new Map<number, (typeof incidentList)[number]>(),
    [incidentList],
  )

  const { open, finished } = useMemo(() => {
    const all = assignments.data ?? []
    const openItems = all.filter((item) => OPEN_STATUSES.has(item.status))
    // An obligation with a deadline outranks one without; otherwise newest first.
    openItems.sort((a, b) => {
      const aDue = incidentByAssignment.get(a.id)?.deadline ?? null
      const bDue = incidentByAssignment.get(b.id)?.deadline ?? null
      if (aDue && bDue) return Date.parse(aDue) - Date.parse(bDue)
      if (aDue) return -1
      if (bDue) return 1
      return Date.parse(b.assigned_at) - Date.parse(a.assigned_at)
    })
    return {
      open: openItems,
      finished: all.filter((item) => !OPEN_STATUSES.has(item.status)),
    }
  }, [assignments.data, incidentByAssignment])

  const current: AssignmentDetail | null = open[0] ?? null
  const alsoOpen = open.slice(1)
  const openIncidentWork = incidentList.filter(isIncidentWorkOpen).length

  const employee = dashboard.data?.employee ?? null
  const evidence = useMemo(() => {
    if (!employee) return null
    return buildRiskEvidence(
      employee.risk_score,
      profile.data?.risk_breakdown ?? dashboard.data?.risk_breakdown,
      profile.data?.recent_events,
    )
  }, [employee, profile.data, dashboard.data])

  const essentialError = dashboard.data ? null : (dashboard.error ?? assignments.error)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display text-fg">My security</h1>
          <p className="mt-1 text-lead text-fg-muted">
            {employee
              ? `${employee.name} · ${employee.role_title}${employee.department ? ` · ${employee.department}` : ''}`
              : 'Your assigned training, the work raised against you, and how your risk score was calculated.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {capabilities.data?.demo_mode ? (
            <DemoDataBadge detail={backingFor('employees').note} />
          ) : null}
          <Button
            variant="primary"
            icon={<Flag className="size-4" aria-hidden="true" />}
            onClick={() => setReportOpen(true)}
          >
            Report something suspicious
          </Button>
        </div>
      </header>

      <AsyncBoundary
        isLoading={dashboard.isLoading || assignments.isLoading}
        error={essentialError}
        onRetry={() => {
          void dashboard.refetch()
          void assignments.refetch()
        }}
        loadingLabel="Loading your security portal"
        skeleton={<PortalSkeleton />}
      >
        <div className="space-y-6">
          {assignments.error && !assignments.data ? (
            <ErrorState
              compact
              error={assignments.error}
              title="Your assigned training could not be loaded"
              onRetry={() => void assignments.refetch()}
            />
          ) : current ? (
            <CurrentAssignmentCard
              assignment={current}
              incident={incidentByAssignment.get(current.id) ?? null}
              modelConnected={modelConnected}
            />
          ) : (
            <EmptyState
              icon={CircleCheck}
              headline="No training is waiting on you"
              description="A module lands here when a real threat reaches your organisation, an analyst approves the training built from it, and the risk engine selects you as someone it actually affects."
            />
          )}

          {alsoOpen.length > 0 ? (
            <Panel
              title="Also assigned to you"
              subtitle="Take these after the one above."
              headingLevel={2}
            >
              <ul className="divide-line">
                {alsoOpen.map((item) => {
                  const incident = incidentByAssignment.get(item.id) ?? null
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <Link
                          to={`/portal/training/${item.id}`}
                          className="text-body text-fg hover:text-brand hover:underline"
                        >
                          {item.module.title}
                        </Link>
                        <span className="ml-2 text-xs text-fg-faint">
                          {incident?.deadline
                            ? `due ${formatDate(incident.deadline)}`
                            : `assigned ${formatDate(item.assigned_at)}`}
                        </span>
                      </span>
                      <Badge status={item.status} size="sm" dot />
                    </li>
                  )
                })}
              </ul>
            </Panel>
          ) : null}

          {incidents.error && !incidents.data ? (
            <ErrorState
              compact
              error={incidents.error}
              title="Incident-response work could not be loaded"
              onRetry={() => void incidents.refetch()}
            />
          ) : (
            <IncidentObligations items={incidentList} />
          )}

          {evidence ? (
            <RiskScorePanel
              evidence={evidence}
              openAssignments={open.length}
              openIncidentWork={openIncidentWork}
            />
          ) : null}

          <TrainingHistory assignments={finished} />

          {reports.error && !reports.data ? (
            <ErrorState
              compact
              error={reports.error}
              title="Your reports could not be loaded"
              onRetry={() => void reports.refetch()}
            />
          ) : (
            <ReportHistory reports={reports.data ?? []} />
          )}

          {dashboard.data ? (
            <Recognition
              points={dashboard.data.gamification.points}
              streak={dashboard.data.gamification.streak}
              reportsSubmitted={dashboard.data.gamification.reports_submitted}
              rank={dashboard.data.gamification.rank}
              badges={dashboard.data.gamification.badges}
              teams={dashboard.data.gamification.team_leaderboard}
            />
          ) : null}
        </div>
      </AsyncBoundary>

      <ReportSuspiciousDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        modelConnected={modelConnected}
      />
    </div>
  )
}
