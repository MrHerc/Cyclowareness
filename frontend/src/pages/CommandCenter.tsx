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
import { useLocale } from '../lib/i18n'
import { DataSourceLabel, DemoDataBadge, LastUpdated } from '../components/data'
import { useToast } from '../components/ui'
import type { ApprovalDecision, AuditEvent } from '../domain/types'
import {
  AnalystActivityPanel,
  AreaGroup,
  ApprovalQueuePanel,
  HeroStrip,
  IncidentTimeline,
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
import { isUnresolvedIncident } from '../features/incident-risks/useRiskFilters'
import { isOpenFinding } from '../features/policy/data'
import { adaptQueue } from '../features/approvals/contract'
import { useAuth } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'
import { useLoopStream } from '../lib/hooks/useLoopStream'

/** Enough to see who did what without turning this into the audit log. */
const AUDIT_LIMIT = 8

export default function CommandCenter() {
  const { locale, t } = useLocale()
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
  // NOT `{ status: 'open' }`. On both of these, `open` is one state out of
  // several that all mean unresolved, so the literal filter under-counted:
  // incident risks reported 0 while three were live, and policy findings
  // reported 3 of 6, hiding two high-severity ones. The predicates below are
  // the product's own definitions of open, shared with the pages these tiles
  // link to — so the number and its destination agree.
  const incidents = useIncidentRisks()
  const findings = usePolicyFindings()
  const threats = useThreats()
  const simulations = useSimulations()
  const integrations = useIntegrations()
  const audit = useAuditLog({ limit: AUDIT_LIMIT })

  const openFindings = findings.data?.filter(isOpenFinding)
  const openIncidents = incidents.data?.filter(isUnresolvedIncident)

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

  // Adapted, not raw. The server names four of these fields differently from
  // the frozen type, so reading the payload straight gave `undefined` for the
  // audience size the approval dialog states out loud. `adaptQueue` is the
  // one place that reconciliation lives; the Approvals page already used it.
  const queuePage = useMemo(() => adaptQueue(queue.data), [queue.data])
  const queueItems = queuePage.rows
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
              ? t('p.targeting-has-been-released-the-decision')
              : t('p.nothing-was-assigned-the-decision-is'),
          tone: 'success',
        })
      } catch (error) {
        toast.show({
          title: t('p.the-decision-was-not-recorded'),
          description: error instanceof Error ? error.message : t('p.the-server-did-not-accept-it'),
          tone: 'error',
        })
        throw error
      }
    },
    // `t` is read inside: a language switch must produce a handler that
    // announces in the new language, not the one the page mounted with.
    [decide, toast, t],
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
            <h1 className="text-title text-fg">{t('page.command-center.title')}</h1>
            <p lang={locale} className="mt-1 text-body text-fg-muted">{t('page.command-center.lead')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DataSourceLabel source="live" detail={t('p.platform-api')} />
            <LastUpdated at={updatedAt} />
            {capabilities.data?.demo_mode ? <DemoDataBadge detail={backing.note} /> : null}
          </div>
        </div>
        <p className="text-xs text-fg-subtle">
          Counts are current as of the last refresh.{' '}
          {metrics
            ? `Rates cover a trailing ${metrics.window_days} days and are withheld below ${metrics.min_sample} resolved events.`
            : t('p.the-measurement-window-is-set-by')}
        </p>
      </header>

      <SystemWarnings warnings={warnings} />

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="sr-only">
          {t('cc.attention')}
        </h2>
        <HeroStrip
          activeRuns={dashboard.data ? dashboard.data.counts.active_runs : null}
          awaitingApproval={queue.data ? (queuePage.total ?? queueItems.length) : null}
          assignedToMe={queue.data ? myQueueItems.length : null}
          newReports={dashboard.data ? dashboard.data.counts.new_reports : null}
          activeSimulations={dashboard.data ? dashboard.data.counts.active_simulations : null}
          highRiskFindings={openFindings ? highRiskCount(openFindings) : null}
          openFindings={openFindings ? openFindings.length : null}
          openIncidentRisks={openIncidents ? openIncidents.length : null}
          sandbox={sandbox.data}
        />
      </section>

      <IncidentTimeline events={auditEvents} />

      <ApprovalQueuePanel
        items={queueItems}
        total={queuePage.total}
        truncated={queuePage.truncated}
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

      <section aria-labelledby="operations-heading" className="space-y-7">
        <h2 id="operations-heading" className="text-h text-fg">
          {t('cc.operationalAreas')}
        </h2>

        {/* The bands below carry the sidebar's own section names, in the
            sidebar's own order. Eight panels in one undifferentiated grid was a
            second copy of the navigation with the labels taken off. */}

        <AreaGroup labelKey="nav.section.operate" to="/threats" linkKey="cc.open.threats" id="operate">
          <ThreatIntakePanel
            threats={threats.data ?? []}
            isLoading={threats.isLoading}
            error={threats.data ? null : threats.error}
            onRetry={() => void threats.refetch()}
          />

        </AreaGroup>

        <AreaGroup labelKey="nav.section.programme" to="/simulations" linkKey="cc.open.simulations" id="programme">
          <SimulationsPanel
            simulations={simulations.data ?? []}
            isLoading={simulations.isLoading}
            error={simulations.data ? null : simulations.error}
            onRetry={() => void simulations.refetch()}
          />

        </AreaGroup>

        <AreaGroup labelKey="nav.section.people" to="/incident-risks" linkKey="cc.open.incidents" id="people">
          <IncidentRiskPanel
            risks={openIncidents ?? []}
            isLoading={incidents.isLoading}
            error={incidents.data ? null : incidents.error}
            onRetry={() => void incidents.refetch()}
          />

          <div className="space-y-2">
            <DepartmentRiskHeatmap
              departments={departments}
              headingLevel={4}
              height={240}
              loading={dashboard.isLoading}
              error={
                dashboard.data || !dashboard.error
                  ? null
                  : t('p.the-dashboard-did-not-answer-so')
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

        </AreaGroup>

        <AreaGroup labelKey="nav.section.governance" to="/policy-intelligence" linkKey="cc.open.policy" id="governance">
          <PolicyExposurePanel
            findings={openFindings ?? []}
            isLoading={findings.isLoading}
            error={findings.data ? null : findings.error}
            onRetry={() => void findings.refetch()}
          />

          <MeasuredOutcomes
            metrics={metrics}
            departments={departments}
            isLoading={dashboard.isLoading}
            error={dashboard.data ? null : dashboard.error}
            onRetry={() => void dashboard.refetch()}
          />

        </AreaGroup>

        <AreaGroup labelKey="nav.section.system" to="/integrations" linkKey="cc.open.integrations" id="system">
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
        </AreaGroup>
      </section>
    </div>
  )
}
