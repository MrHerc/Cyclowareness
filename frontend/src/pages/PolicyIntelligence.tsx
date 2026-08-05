/**
 * Policy drift and exposure — the overview.
 *
 * The question this screen answers is "where has reality moved away from what
 * we wrote down". It answers it in one direction only: counts first, then the
 * documents those counts belong to, then the individual findings worth opening
 * today. Nothing here is a summary of a summary — every number comes from
 * `/api/policy/stats` with the window and sample size it was taken over, and
 * the two rankings are computed from the findings actually loaded and say so.
 *
 * `stats` and the findings list are separate queries on purpose. The counts are
 * the server's, computed over every finding in the window; the rankings need
 * the rows themselves and are therefore bounded by the page that was fetched.
 * Mixing the two would let a "top five" quietly claim to be a top five of
 * everything.
 */

import { AlertTriangle, ListFilter, ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { SeverityBarChart } from '../components/charts'
import { HonestMetric } from '../components/data'
import {
  AsyncBoundary,
  EmptyState,
  SkeletonCard,
  SkeletonText,
} from '../components/states'
import { Button, Panel } from '../components/ui'
import type { Policy, Severity } from '../domain/types'
import {
  OPEN_FINDING_STATUSES,
  isOpenFinding,
  itemsOf,
  pageMetaOf,
  readPolicyStats,
  sumOf,
  type PolicyFinding as Finding,
} from '../features/policy/data'
import { DriftingPolicies } from '../features/policy/DriftingPolicies'
import { FindingCard } from '../features/policy/FindingCard'
import { PolicyHeader } from '../features/policy/PolicyHeader'
import { StatusBreakdown } from '../features/policy/StatusBreakdown'
import { SEVERITY_ORDER } from '../features/policy/vocabulary'
import { usePolicies, usePolicyFindings, usePolicyStats } from '../lib/api/queries'

/** Module scope so the query key is stable across renders. */
const RANKING_PAGE: Record<string, string | number | undefined> = { limit: 200 }

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

function byUrgency(a: Finding, b: Finding): number {
  const rank = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  if (rank !== 0) return rank
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1
  return b.detected_at.localeCompare(a.detected_at)
}

export default function PolicyIntelligence() {
  const t = useT()
  const stats = usePolicyStats()
  const findings = usePolicyFindings(RANKING_PAGE)
  const policies = usePolicies()

  const summary = readPolicyStats(stats.data)
  const rows = itemsOf<Finding>(findings.data)
  const rowsMeta = pageMetaOf(findings.data)
  const library = itemsOf<Policy>(policies.data)

  const open = rows.filter(isOpenFinding)
  const urgent = [...open].sort(byUrgency).slice(0, 6)
  const policyNames = new Map(library.map((policy) => [policy.id, policy.name]))

  const severityData = summary
    ? SEVERITY_ORDER.map((severity) => ({
        severity: severity as Severity,
        count: summary.by_severity[severity] ?? 0,
      }))
    : []

  const criticalAndHigh = summary ? sumOf(summary.by_severity, ['critical', 'high']) : null
  const stillOpen = summary ? sumOf(summary.by_status, OPEN_FINDING_STATUSES) : null

  return (
    <div className="space-y-6">
      <PolicyHeader
        title={t('page.policy.title')}
        description={t('x.where-the-organisations-own-documents')}
        actions={
          <>
            <Button asChild variant="secondary" icon={<ScrollText className="size-4" />}>
              <Link to="/policy-intelligence/policies">Policy library</Link>
            </Button>
            <Button asChild variant="primary" icon={<ListFilter className="size-4" />}>
              <Link to="/policy-intelligence/findings?status=open">Work the queue</Link>
            </Button>
          </>
        }
      />

      {/* --- the counts, with what they are counts of ------------------------ */}
      <AsyncBoundary
        isLoading={stats.isLoading}
        error={summary ? null : stats.error}
        onRetry={() => void stats.refetch()}
        loadingLabel={t('x.loading-policy-finding-counts')}
        skeleton={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <SkeletonCard key={key} metric lines={2} />
            ))}
          </div>
        }
      >
        {summary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Panel tone="quiet">
                <HonestMetric
                  label="Findings detected"
                  value={summary.sample_size}
                  format="number"
                  sample={summary.sample_size}
                  sampleNoun="findings"
                  windowDays={summary.window_days}
                  source="live"
                  sourceDetail="Counted by the platform API over its own records"
                  lastUpdated={summary.window_end}
                  hint={`${summary.outside_window} older finding${summary.outside_window === 1 ? '' : 's'} sit outside this window.`}
                />
              </Panel>

              <Panel tone="quiet">
                <HonestMetric
                  label="Critical and high"
                  value={criticalAndHigh}
                  format="number"
                  sample={summary.sample_size}
                  sampleNoun="findings"
                  windowDays={summary.window_days}
                  tone={criticalAndHigh !== null && criticalAndHigh > 0 ? 'critical' : 'neutral'}
                  source="live"
                  hint="Severity is set when a finding is raised, and is not recomputed as it ages."
                />
              </Panel>

              <Panel tone="quiet">
                <HonestMetric
                  label="Still open"
                  value={stillOpen}
                  format="number"
                  sample={summary.sample_size}
                  sampleNoun="findings"
                  windowDays={summary.window_days}
                  source="live"
                  hint="Open, in review, remediation planned or training assigned."
                />
              </Panel>

              <Panel tone="quiet">
                <HonestMetric
                  label="Overdue and open"
                  value={summary.overdue_open_all_time}
                  format="number"
                  sample={summary.total_all_time}
                  sampleNoun="findings on record"
                  tone={summary.overdue_open_all_time > 0 ? 'high' : 'neutral'}
                  source="live"
                  hint="Counted over every finding, not just this window — being overdue is a fact about today."
                />
              </Panel>
            </div>

            {summary.note ? <p className="text-xs text-fg-faint">{summary.note}</p> : null}
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            headline="The finding counts are unavailable"
            description={t('x.the-stats-endpoint-answered-but')}
          />
        )}
      </AsyncBoundary>

      {/* --- severity and status -------------------------------------------- */}
      {/* The two charts below carry h3 titles of their own, and the page's only
          other heading is its h1 — so a reader navigating by heading heard h1
          then h3 and was told a level had been skipped. This names the pair. */}
      <section aria-labelledby="policy-distribution" className="space-y-3">
      <h2 id="policy-distribution" className="text-h text-fg">
        How the open findings are distributed
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeverityBarChart
          data={severityData}
          title={t('x.findings-by-severity')}
          caption={
            summary
              ? `Last ${summary.window_days} days · n=${summary.sample_size}`
              : 'Counts unavailable'
          }
          loading={stats.isLoading}
          error={stats.error && !summary ? stats.error.message : null}
        />

        <Panel
          title={t('x.findings-by-status')}
          subtitle={
            summary
              ? `Every status the API knows, over the last ${summary.window_days} days. Zero is drawn, not hidden.`
              : 'Counts unavailable'
          }
        >
          <AsyncBoundary
            isLoading={stats.isLoading}
            error={summary ? null : stats.error}
            onRetry={() => void stats.refetch()}
            loadingLabel={t('x.loading-the-status-breakdown')}
            skeleton={<SkeletonText lines={7} />}
          >
            {summary ? (
              <StatusBreakdown counts={summary.by_status} total={summary.sample_size} />
            ) : null}
          </AsyncBoundary>
        </Panel>
      </div>
      </section>

      {/* --- drift ranking and the queue ------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel
          title={t('x.policies-most-in-drift')}
          subtitle={`Ranked by open findings across the ${rows.length} finding${rows.length === 1 ? '' : 's'} loaded here.`}
          footer={
            rowsMeta.total !== null && rowsMeta.total > rows.length
              ? `${rowsMeta.note || `The API returned ${rows.length} of ${rowsMeta.total} findings.`} This ranking covers only what was returned.`
              : undefined
          }
        >
          <AsyncBoundary
            isLoading={findings.isLoading || policies.isLoading}
            error={rows.length > 0 ? null : findings.error}
            onRetry={() => void findings.refetch()}
            loadingLabel={t('x.loading-findings')}
            skeleton={<SkeletonText lines={5} />}
          >
            <DriftingPolicies findings={rows} policies={library} />
          </AsyncBoundary>
        </Panel>

        <Panel
          title={t('x.highestseverity-open-findings')}
          subtitle={t('x.ordered-by-severity-then-by')}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/policy-intelligence/findings?status=open">See all open</Link>
            </Button>
          }
        >
          <AsyncBoundary
            isLoading={findings.isLoading}
            error={rows.length > 0 ? null : findings.error}
            onRetry={() => void findings.refetch()}
            loadingLabel={t('x.loading-open-findings')}
            isEmpty={urgent.length === 0}
            empty={
              <EmptyState
                compact
                headline="Nothing is open"
                description={t('x.findings-appear-here-while-their')}
              />
            }
            skeleton={
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((key) => (
                  <SkeletonCard key={key} lines={3} />
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {urgent.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  policyName={finding.policy_id !== null ? policyNames.get(finding.policy_id) : null}
                />
              ))}
            </div>
          </AsyncBoundary>
        </Panel>
      </div>
    </div>
  )
}
