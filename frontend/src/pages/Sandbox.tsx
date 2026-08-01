/**
 * Cyclowareness Sandbox — submission and the analysis queue.
 *
 * The page is composition only: it owns the query hooks and the one piece of
 * shared view state (the status filter, kept in the URL so a view can be sent to
 * someone), and hands data down. Everything that draws is in
 * `features/sandbox/`.
 */

import { FlaskConical } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { CapabilityStrip } from '../features/sandbox/CapabilityStrip'
import { JobsTable } from '../features/sandbox/JobsTable'
import { QueueSummary } from '../features/sandbox/QueueSummary'
import { SubmissionPanel } from '../features/sandbox/SubmissionPanel'
import { DataSourceLabel } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonTable } from '../components/states'
import { Panel, Select } from '../components/ui'
import { useSandboxCapabilities, useSandboxJobs, useSandboxStats } from '../lib/api/queries'
import { backingFor } from '../lib/demo/registry'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All submissions' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'awaiting_password', label: 'Awaiting password' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export default function Sandbox() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'all'
  const backing = backingFor('sandbox')

  const capabilities = useSandboxCapabilities()
  const jobs = useSandboxJobs({ status: status === 'all' ? undefined : status, limit: 50 })
  const stats = useSandboxStats()

  function setStatus(next: string) {
    const updated = new URLSearchParams(params)
    if (next === 'all') updated.delete('status')
    else updated.set('status', next)
    setParams(updated, { replace: true })
  }

  const rows = jobs.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-display text-fg">Sandbox</h1>
        <p className="text-lead text-fg-muted">
          Static forensic analysis of a file or a URL, with the reasoning behind every point of the
          score.
        </p>
        <DataSourceLabel source="sandbox" detail={backing.note} />
      </header>

      <SubmissionPanel />

      {/* Rendered only once the counts have actually arrived. Zeroed tiles under
          a spinner are indistinguishable from a deployment that has analysed
          nothing, and that is the one reading this panel must never invite. */}
      {stats.data ? <QueueSummary stats={stats.data} /> : null}

      <AsyncBoundary
        isLoading={capabilities.isLoading}
        error={capabilities.data ? null : capabilities.error}
        onRetry={() => void capabilities.refetch()}
        loadingLabel="Asking the sandbox what it can do"
        skeleton={<SkeletonCard lines={4} />}
      >
        {capabilities.data ? <CapabilityStrip capabilities={capabilities.data} /> : null}
      </AsyncBoundary>

      <Panel
        title="Submissions"
        subtitle="Refreshes while a job is moving."
        flush
        actions={
          <Select
            label="Status"
            labelHidden
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={setStatus}
            className="w-52"
          />
        }
      >
        <AsyncBoundary
          isLoading={jobs.isLoading}
          error={jobs.data ? null : jobs.error}
          onRetry={() => void jobs.refetch()}
          loadingLabel="Loading submissions"
          skeleton={<SkeletonTable rows={5} cols={6} header={false} className="rounded-none border-0" />}
          isEmpty={rows.length === 0}
          empty={
            <EmptyState
              icon={FlaskConical}
              compact
              className="px-5"
              headline={status === 'all' ? 'Nothing has been submitted yet' : 'No jobs in this state'}
              description={
                status === 'all'
                  ? 'Upload a file or submit a URL above. Every submission appears here the moment it is queued, and updates as the engine works through it.'
                  : 'No submission currently holds this status. Clear the filter to see everything the engine has analysed.'
              }
            />
          }
        >
          <JobsTable jobs={rows} />
        </AsyncBoundary>
      </Panel>
    </div>
  )
}
