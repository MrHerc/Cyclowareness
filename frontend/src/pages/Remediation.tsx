/**
 * The Remediation Engine, as a screen.
 *
 * The order is an argument. Plans waiting for a human come first, because
 * nothing here reaches a person until someone named approves it. Then the two
 * refusals — the behaviours the catalogue could not answer, and the cases where
 * a control is the fix and a module is not — because a queue with an empty
 * refusal list beside it is a queue that has been quietly attaching whatever
 * was nearest.
 *
 * Blocked plans are shown, not hidden. A plan the output firewall refused is a
 * security signal: a spike in one rejection code means somebody is probing what
 * this product will write into an employee's screen.
 *
 * Composition only. Everything that draws lives in `features/remediation/`.
 */

import { ShieldAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ControlGapList } from '../features/remediation/ControlGapList'
import { CoverageGapList } from '../features/remediation/CoverageGapList'
import { PlanQueue } from '../features/remediation/PlanQueue'
import { RemediationSummary } from '../features/remediation/RemediationSummary'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonTable } from '../components/states'
import { Panel, Select } from '../components/ui'
import {
  useControlGaps,
  useCoverageGaps,
  useRemediationPlans,
  useRemediationStats,
} from '../lib/api/queries'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Every plan' },
  { value: 'proposed', label: 'Waiting for a decision' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'blocked', label: 'Refused by the firewall' },
  { value: 'delivered', label: 'Delivered' },
]

export default function Remediation() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'all'

  const plans = useRemediationPlans({ status: status === 'all' ? undefined : status, limit: 100 })
  const stats = useRemediationStats()
  const coverage = useCoverageGaps()
  const control = useControlGaps()

  function setStatus(next: string) {
    const updated = new URLSearchParams(params)
    if (next === 'all') updated.delete('status')
    else updated.set('status', next)
    setParams(updated, { replace: true })
  }

  const rows = plans.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-display text-fg">Remediation</h1>
        <p className="text-lead text-fg-muted">
          What gets attached to a named person after something happened to them — and, just as
          often, the reasoned decision to attach nothing.
        </p>
      </header>

      {/* Counted in SQL over every plan, never from the page below. */}
      {stats.data ? <RemediationSummary stats={stats.data} /> : null}

      <Panel
        title="Plans"
        subtitle="Nothing reaches a person until a named human approves it."
        flush
        actions={
          <Select
            label="Status"
            labelHidden
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={setStatus}
            className="w-56"
          />
        }
      >
        <AsyncBoundary
          isLoading={plans.isLoading}
          error={plans.data ? null : plans.error}
          onRetry={() => void plans.refetch()}
          loadingLabel="Loading remediation plans"
          skeleton={
            <SkeletonTable rows={4} cols={5} header={false} className="rounded-none border-0" />
          }
          isEmpty={rows.length === 0}
          empty={
            <EmptyState
              icon={ShieldAlert}
              compact
              className="px-5"
              headline={
                status === 'all' ? 'No plan has been raised yet' : 'No plan holds this status'
              }
              description={
                status === 'all'
                  ? 'A plan is raised when a signal names a specific person — a simulation click, a credential submission, a malicious verdict on something they received. Nothing is raised on a schedule.'
                  : 'Clear the filter to see every plan the engine has produced.'
              }
            />
          }
        >
          <PlanQueue plans={rows} />
        </AsyncBoundary>
      </Panel>

      <AsyncBoundary
        isLoading={coverage.isLoading}
        error={coverage.data ? null : coverage.error}
        onRetry={() => void coverage.refetch()}
        loadingLabel="Loading coverage gaps"
        skeleton={<SkeletonCard lines={4} />}
      >
        {coverage.data ? <CoverageGapList data={coverage.data} /> : null}
      </AsyncBoundary>

      <AsyncBoundary
        isLoading={control.isLoading}
        error={control.data ? null : control.error}
        onRetry={() => void control.refetch()}
        loadingLabel="Loading control gaps"
        skeleton={<SkeletonCard lines={3} />}
      >
        {control.data ? <ControlGapList data={control.data} /> : null}
      </AsyncBoundary>
    </div>
  )
}
