/**
 * The Executive View — one screen, read-only, and nothing on it that was not
 * measured.
 *
 * This page is composition: it owns every query and hands plain data to the
 * components in `features/executive`. Five decisions shape it.
 *
 * **The sections are the questions.** A board asks five things — is behaviour
 * improving, which departments are weak, which real threats drove training,
 * which risks remain unresolved, is measurable human risk falling — so each of
 * those is a heading, in question form, with one line underneath saying how to
 * read the answer. Anything that would need a security background to interpret
 * is not on this page.
 *
 * **The range control governs the charts and says so.** `/api/dashboard/executive`
 * takes no range parameter and always returns the last 180 daily snapshots, so
 * the selector clips real fetched data rather than pretending to re-query. The
 * metric tiles keep the server's fixed trailing window, and the caption under
 * the charts states that boundary instead of letting one control look like it
 * governs the page.
 *
 * **Two of the ten metrics are absent, on purpose.** The backend exposes no
 * average reporting time and no quiz pass rate. Both are rendered with the
 * not-measured treatment and a line saying what would produce them, because
 * deriving either in the browser would put a figure on a board slide that
 * nothing on the server could reproduce.
 *
 * **Restricted is not the same as empty.** Loop runs and incident risks are
 * analyst-scoped; an executive account is refused them. Where that happens the
 * page says the security team holds the record rather than rendering a zero, a
 * dash, or an empty state that would read as good news.
 *
 * **A failed poll does not take the numbers away.** `error` reaches a boundary
 * only when there is nothing left to render, as everywhere else in this product.
 */

import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import {
  DataSourceLabel,
  DateRangeSelector,
  DemoDataBadge,
  LastUpdated,
  defaultDateRange,
  fromISODate,
  resolveRange,
  type DateRangePreset,
  type DateRangeValue,
} from '../components/data'
import {
  AsyncBoundary,
  EmptyState,
  SkeletonCard,
  SkeletonChart,
} from '../components/states'
import {
  BehaviourCharts,
  DepartmentStandingPanels,
  ExecutiveSection,
  PostureMetrics,
  RecommendationList,
  SituationBriefing,
  ThreatsToTraining,
  UnresolvedRisks,
  clipTrend,
  openFindingsOf,
  recommendations,
  scoredHeadcount,
} from '../features/executive'
import {
  POLL_QUEUE,
  useCapabilities,
  useExecutiveDashboard,
  useIncidentRisks,
  useLoops,
  usePolicyFindings,
} from '../lib/api/queries'
import { useLocale } from '../lib/i18n'
import { useAuth } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'

/**
 * The servers' own page cap on both governance lists. Asking for it means one
 * call covers the whole register in every realistic deployment — and when the
 * response comes back exactly this long, the scan may have been capped, which
 * the counts below then report as a floor rather than a total.
 */
const PAGE_LIMIT = 200
const FINDINGS_PAGE: Record<string, string | number | undefined> = { limit: PAGE_LIMIT }
const INCIDENTS_PAGE: Record<string, string | undefined> = { limit: String(PAGE_LIMIT) }

const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'quarter']

function isPreset(value: string | null): value is Exclude<DateRangePreset, 'custom'> {
  return value !== null && value !== 'custom' && (PRESETS as string[]).includes(value)
}

/** The window lives in the URL so "the quarter we discussed" is a link. */
function readRange(params: URLSearchParams): DateRangeValue {
  const preset = params.get('range')
  const from = params.get('from')
  const to = params.get('to')

  if (preset === 'custom' && from && to && fromISODate(from) && fromISODate(to) && from <= to) {
    return { preset: 'custom', from, to }
  }
  if (isPreset(preset)) return { preset, ...resolveRange(preset) }
  return defaultDateRange('90d')
}

export default function Executive() {
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()

  // Loop runs and incident risks are analyst-scoped. Asking for them as an
  // executive would be a guaranteed 403 on every poll, so the query is not made
  // and the affected panels say who holds the record instead.
  const canReadRuns = can('loops.view')
  const canReadIncidents = can('incident_risks.view')

  const dashboard = useExecutiveDashboard()
  const capabilities = useCapabilities()
  const findings = usePolicyFindings(FINDINGS_PAGE)
  const incidents = useIncidentRisks(INCIDENTS_PAGE, { enabled: canReadIncidents })
  // `useLoops` defaults to the four-second operational cadence. This is a
  // posture page, not the command centre — nobody watches a quarter move in
  // real time, and a forgotten tab should not poll the run table all afternoon.
  const runs = useLoops(undefined, { enabled: canReadRuns, refetchInterval: POLL_QUEUE })

  const range = useMemo(() => readRange(params), [params])

  const setRange = useCallback(
    (next: DateRangeValue) => {
      setParams(
        (previous) => {
          const search = new URLSearchParams(previous)
          search.set('range', next.preset)
          if (next.preset === 'custom') {
            search.set('from', next.from)
            search.set('to', next.to)
          } else {
            search.delete('from')
            search.delete('to')
          }
          return search
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const dash = dashboard.data
  // Null, not an empty array: a findings request that failed must not count as
  // zero open findings, which is the most flattering possible reading of it.
  const openFindings = useMemo(
    () => (findings.data ? openFindingsOf(findings.data) : null),
    [findings.data],
  )
  const findingsCapped = (findings.data?.length ?? 0) >= PAGE_LIMIT

  const clipped = useMemo(
    () => (dash ? clipTrend(dash.trend, range.from, range.to) : []),
    [dash, range.from, range.to],
  )

  const advice = useMemo(
    () =>
      recommendations({
        metrics: dash?.metrics,
        departments: dash?.departments ?? [],
        loopsClosed: dash ? dash.loops_closed : null,
        openFindings,
        incidentRisks: canReadIncidents ? (incidents.data ?? null) : null,
      }),
    [dash, openFindings, incidents.data, canReadIncidents],
  )

  const updatedAt = dashboard.dataUpdatedAt ? new Date(dashboard.dataUpdatedAt).toISOString() : null
  // The organisation itself is what this page reports on, so the badge carries
  // the roster's backing note rather than a generic one: the company is a
  // seeded fiction and the risk model operating on it is the real one.
  const backing = backingFor('employees')
  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-display text-fg">{t('page.executive.title')}</h1>
            <p lang={locale} className="mt-2 text-lead text-fg-muted">{t('page.executive.lead')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DataSourceLabel source="live" detail={t('p.platform-api')} />
            <LastUpdated at={updatedAt} />
            {capabilities.data?.demo_mode ? <DemoDataBadge detail={backing.note} /> : null}
          </div>
        </div>
        {dash ? (
          <p className="text-xs text-fg-subtle">
            Rates cover a trailing {dash.metrics.window_days} days and are withheld below{' '}
            {dash.metrics.min_sample} resolved events, because a rate over three events is not a
            rate.
          </p>
        ) : null}
      </header>

      <AsyncBoundary
        isLoading={dashboard.isLoading}
        error={dash ? null : dashboard.error}
        onRetry={() => void dashboard.refetch()}
        loadingLabel={t('x.loading-the-organisation-posture')}
        skeleton={
          <div className="space-y-6">
            <SkeletonCard lines={3} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
              <SkeletonCard metric lines={1} />
            </div>
            <SkeletonChart height={280} />
          </div>
        }
        isEmpty={!dashboard.isLoading && !dash}
        empty={
          <EmptyState
            icon={BarChart3}
            headline="The dashboard returned nothing"
            description={t('x.the-executive-endpoint-answered-without')}
          />
        }
      >
        {dash ? (
          <div className="space-y-10">
            <SituationBriefing
              briefing={dash.briefing}
              briefingSource={dash.briefing_source}
              briefingAdjustments={dash.briefing_adjustments}
              metrics={dash.metrics}
              modelConnected={modelConnected}
            />

            <ExecutiveSection
              id="behaviour-heading"
              question="Is behaviour improving, and is measurable human risk falling?"
              meaning="Clicks falling while reports rise is the shape that means training changed behaviour. The risk score is the same evidence rolled up per person; completion only tells you people turned up."
              actions={
                <DateRangeSelector
                  value={range}
                  onChange={setRange}
                  label={t('p.chart-window')}
                />
              }
            >
              <div className="space-y-6">
                <PostureMetrics
                  metrics={dash.metrics}
                  trend={dash.trend}
                  headcount={scoredHeadcount(dash.departments)}
                  updatedAt={updatedAt}
                />
                {/* The boundary above guarantees data here, so these charts have
                    no loading or error state of their own to resolve. */}
                <BehaviourCharts
                  points={clipped}
                  range={{ from: range.from, to: range.to }}
                  metricWindowDays={dash.metrics.window_days}
                />
              </div>
            </ExecutiveSection>

            <ExecutiveSection
              id="departments-heading"
              question="Which departments are weak?"
              meaning="Average risk score today, worst first, with the number of people each average is drawn from. Small teams move further on one incident, so read the headcount alongside the score."
            >
              <DepartmentStandingPanels
                departments={dash.departments}
                onSelect={
                  can('employees.view')
                    ? (department) => navigate(`/employees?department=${department.id}`)
                    : undefined
                }
              />
            </ExecutiveSection>

            <ExecutiveSection
              id="threats-heading"
              question="Which real threats drove training?"
              meaning="Not a syllabus. Each of these was an artifact that actually arrived, was analysed, and was approved by a named person before anyone was assigned anything."
            >
              <ThreatsToTraining
                loopsClosed={dash.loops_closed}
                runs={canReadRuns ? (runs.data ?? []) : null}
                updatedAt={updatedAt}
                loading={canReadRuns && runs.isLoading}
                error={
                  canReadRuns && !runs.data && runs.error
                    ? t('p.loop-runs-could-not-be-read')
                    : null
                }
              />
            </ExecutiveSection>

            <ExecutiveSection
              id="unresolved-heading"
              question="Which risks remain unresolved?"
              meaning="Open means nobody has resolved it, accepted it in writing, or ruled it out. An open finding is an unowned decision, not a queue item."
            >
              <UnresolvedRisks
                openFindings={openFindings}
                truncated={findingsCapped}
                incidentRisks={canReadIncidents ? (incidents.data ?? []) : null}
                minSample={dash.metrics.min_sample}
                updatedAt={updatedAt}
                loading={findings.isLoading}
                error={
                  !findings.data && findings.error
                    ? t('p.policy-findings-could-not-be-read')
                    : null
                }
              />
            </ExecutiveSection>

            <ExecutiveSection
              id="recommendations-heading"
              question="What should happen next?"
              meaning="Generated from the figures above by a fixed rule set, not by a model and not by a person. Each item names the measurement behind it so you can disagree with the rule."
            >
              <RecommendationList items={advice} />
            </ExecutiveSection>
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  )
}
