/**
 * The Analyst Command Center — the primary operational surface.
 *
 * This page is composition and nothing else: it owns every query and the one
 * mutation, and hands plain data to the components in
 * `features/command-center`. Four decisions shape it.
 *
 * **Decisions before charts.** The first thing on screen is a row of counts
 * that each link to the items they counted, and the first list is the approval
 * queue. Trend lines sit below the fold, because a trend is context and the
 * gate is work.
 *
 * **Errors do not take the numbers away.** `error` is passed to a boundary only
 * when there is nothing left to render (`data ? null : query.error`). React
 * Query keeps the last good answer through a failed poll, and a four-second
 * blip on a live dashboard belongs to `DisconnectedBanner` — which the shell
 * already mounts — not to eight error panels at once.
 *
 * **The stage filter lives in the URL.** "The four runs stuck in Targeting" is
 * then a link somebody can paste to a colleague.
 *
 * **The window is stated, not offered.** `/api/dashboard/analyst` computes its
 * rates over a trailing window the server fixes and takes no range parameter,
 * so this page prints the window it was given rather than rendering a date
 * picker that could not change anything.
 */

import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DepartmentRiskHeatmap } from '../components/charts'
import { DataSourceLabel, DemoDataBadge, LastUpdated } from '../components/data'
import { useToast } from '../components/ui'
import type { ApprovalDecision, AuditEvent } from '../domain/types'
import {
  AnalystActivityPanel,
  ApprovalQueuePanel,
  HeroStrip,
  IncidentRiskPanel,
  IntegrationHealthPanel,
  LoopSection,
  MeasuredOutcomes,
  PolicyExposurePanel,
  SimulationsPanel,
  SystemWarnings,
  ThreatIntakePanel,
  assignedTo,
  combineRuns,
  highRiskCount,
  parsePosition,
  systemWarnings,
  type QueueScope,
  type RunPosition,
} from '../features/command-center'
import { useApprovalDecision } from '../lib/api/mutations'
import {
  useAnalystDashboard,
  useApprovalQueue,
  useAuditLog,
  useCapabilities,
  useIncidentRisks,
  useIntegrations,
  usePolicyFindings,
  useSandboxCapabilities,
  useSimulations,
  useThreats,
} from '../lib/api/queries'
import { useAuth } from '../lib/auth/AuthProvider'
import { backingFor } from '../lib/demo/registry'
import { useLoopStream } from '../lib/hooks/useLoopStream'

/** Enough to see who did what without turning this into the audit log. */
const AUDIT_LIMIT = 8

export default function CommandCenter() {
  // Loop transitions arrive over the socket and invalidate the loop, dashboard
  // and approval caches. Polling underneath it means a dropped socket costs a
  // few seconds of freshness rather than a frozen screen.
  useLoopStream()

  const { session, can } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const dashboard = useAnalystDashboard()
  // No `sort` is sent: the server's accepted sort values are not part of the
  // frozen contract, and this page orders by wait time itself anyway.
  const queue = useApprovalQueue()
  const capabilities = useCapabilities()
  const sandbox = useSandboxCapabilities()
  const incidents = useIncidentRisks({ status: 'open' })
  const findings = usePolicyFindings({ status: 'open' })
  const threats = useThreats()
  const simulations = useSimulations()
  const integrations = useIntegrations()
  const audit = useAuditLog({ limit: AUDIT_LIMIT })

  const selectedStage = parsePosition(params.get('stage'))
  const queueScope: QueueScope = params.get('queue') === 'mine' ? 'mine' : 'all'

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value === null) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const selectStage = useCallback(
    (next: RunPosition) => {
      setParam('stage', next === null ? null : String(next))
    },
    [setParam],
  )

  const selectScope = useCallback(
    (next: QueueScope) => {
      setParam('queue', next === 'all' ? null : next)
    },
    [setParam],
  )

  const runs = useMemo(
    () => combineRuns(dashboard.data?.active_runs, dashboard.data?.recent_runs),
    [dashboard.data],
  )

  const queueItems = useMemo(() => queue.data ?? [], [queue.data])
  const myQueueItems = useMemo(
    () => assignedTo(queueItems, { email: session?.email, name: session?.employee_name }),
    [queueItems, session],
  )

  // `/api/audit` answers with either a bare array or a paged envelope depending
  // on deployment age. Both shapes are in the contract, so both are read.
  const auditEvents = useMemo<AuditEvent[]>(() => {
    const data = audit.data
    if (!data) return []
    return Array.isArray(data) ? data : data.events
  }, [audit.data])

  const warnings = useMemo(
    () =>
      systemWarnings({
        capabilities: capabilities.data,
        sandbox: sandbox.data,
        integrations: integrations.data,
        runs,
      }),
    [capabilities.data, sandbox.data, integrations.data, runs],
  )

  const decide = useApprovalDecision()

  /**
   * The decision is awaited rather than optimistic, and the toast is raised
   * here rather than through the mutation's options — `useApprovalDecision`
   * spreads caller options after its own `onSuccess`, so passing one would
   * silently replace the cache invalidation the gate depends on.
   */
  const handleDecide = useCallback(
    async (runId: number, decision: ApprovalDecision) => {
      try {
        await decide.mutateAsync({ runId, decision })
        toast.show({
          title: `Run #${runId} ${decision === 'approve' ? 'approved' : 'rejected'}`,
          description:
            decision === 'approve'
              ? 'Targeting has been released. The decision is in the audit log.'
              : 'Nothing was assigned. The decision is in the audit log.',
          tone: 'success',
        })
      } catch (error) {
        toast.show({
          title: 'The decision was not recorded',
          description: error instanceof Error ? error.message : 'The server did not accept it.',
          tone: 'error',
        })
        throw error
      }
    },
    [decide, toast],
  )

  const backing = backingFor('command-center')
  const metrics = dashboard.data?.metrics
  const departments = dashboard.data?.departments ?? []
  const updatedAt = dashboard.dataUpdatedAt
    ? new Date(dashboard.dataUpdatedAt).toISOString()
    : null

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-title text-fg">Command Center</h1>
            <p className="mt-1 text-body text-fg-muted">
              Where the loop is right now, and what is waiting on a person.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DataSourceLabel source="live" detail="Platform API" />
            <LastUpdated at={updatedAt} />
            {capabilities.data?.demo_mode ? <DemoDataBadge detail={backing.note} /> : null}
          </div>
        </div>
        <p className="text-xs text-fg-subtle">
          Counts are current as of the last refresh.{' '}
          {metrics
            ? `Rates cover a trailing ${metrics.window_days} days and are withheld below ${metrics.min_sample} resolved events.`
            : 'The measurement window is set by the server and reported with each rate.'}
        </p>
      </header>

      <SystemWarnings warnings={warnings} />

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="sr-only">
          What needs attention now
        </h2>
        <HeroStrip
          activeRuns={dashboard.data ? dashboard.data.counts.active_runs : null}
          awaitingApproval={queue.data ? queue.data.length : null}
          assignedToMe={queue.data ? myQueueItems.length : null}
          newReports={dashboard.data ? dashboard.data.counts.new_reports : null}
          activeSimulations={dashboard.data ? dashboard.data.counts.active_simulations : null}
          highRiskFindings={findings.data ? highRiskCount(findings.data) : null}
          openFindings={findings.data ? findings.data.length : null}
          openIncidentRisks={incidents.data ? incidents.data.length : null}
          sandbox={sandbox.data}
        />
      </section>

      <ApprovalQueuePanel
        items={queueItems}
        mine={myQueueItems}
        scope={queueScope}
        onScopeChange={selectScope}
        isLoading={queue.isLoading}
        error={queue.data ? null : queue.error}
        onRetry={() => void queue.refetch()}
        modelConnected={
          capabilities.data ? capabilities.data.ai_provider === 'anthropic' : undefined
        }
        canDecide={can('approvals.decide')}
        onDecide={handleDecide}
        busy={decide.isPending}
      />

      <LoopSection
        runs={runs}
        selected={selectedStage}
        onSelect={selectStage}
        isLoading={dashboard.isLoading}
        error={dashboard.data ? null : dashboard.error}
        onRetry={() => void dashboard.refetch()}
      />

      <section aria-labelledby="operations-heading" className="space-y-3">
        <h2 id="operations-heading" className="label text-fg-subtle">
          Operational areas
        </h2>

        <div className="grid gap-4 xl:grid-cols-2">
          <ThreatIntakePanel
            threats={threats.data ?? []}
            isLoading={threats.isLoading}
            error={threats.data ? null : threats.error}
            onRetry={() => void threats.refetch()}
          />

          <SimulationsPanel
            simulations={simulations.data ?? []}
            isLoading={simulations.isLoading}
            error={simulations.data ? null : simulations.error}
            onRetry={() => void simulations.refetch()}
          />

          <PolicyExposurePanel
            findings={findings.data ?? []}
            isLoading={findings.isLoading}
            error={findings.data ? null : findings.error}
            onRetry={() => void findings.refetch()}
          />

          <IncidentRiskPanel
            risks={incidents.data ?? []}
            isLoading={incidents.isLoading}
            error={incidents.data ? null : incidents.error}
            onRetry={() => void incidents.refetch()}
          />

          <div className="space-y-2">
            <DepartmentRiskHeatmap
              departments={departments}
              height={240}
              loading={dashboard.isLoading}
              error={
                dashboard.data || !dashboard.error
                  ? null
                  : 'The dashboard did not answer, so no department standing can be shown.'
              }
            />
            <p className="text-xs text-fg-subtle">
              Standing, not movement — the dashboard reports a current average per department and
              no per-department history to difference it against.{' '}
              <Link
                to="/departments"
                className="text-brand-fg underline-offset-4 hover:underline"
              >
                Open departments
              </Link>
              .
            </p>
          </div>

          <MeasuredOutcomes
            metrics={metrics}
            departments={departments}
            isLoading={dashboard.isLoading}
            error={dashboard.data ? null : dashboard.error}
            onRetry={() => void dashboard.refetch()}
          />

          <IntegrationHealthPanel
            integrations={integrations.data ?? []}
            isLoading={integrations.isLoading}
            error={integrations.data ? null : integrations.error}
            onRetry={() => void integrations.refetch()}
          />

          <AnalystActivityPanel
            events={auditEvents}
            isLoading={audit.isLoading}
            error={audit.data ? null : audit.error}
            onRetry={() => void audit.refetch()}
          />
        </div>
      </section>
    </div>
  )
}
