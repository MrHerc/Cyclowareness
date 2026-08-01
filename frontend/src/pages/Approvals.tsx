/**
 * The approval queue — the front door to the product's one hard control.
 *
 * Composition only: the page owns the filter state and the two queries, and
 * hands rows to the table. Everything that decides how a row *looks* lives in
 * `features/approvals`.
 */

import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Panel, Tooltip, TONE_TEXT } from '../components/ui'
import { adaptQueue, type QueueRow } from '../features/approvals/contract'
import { waitLabel, waitTone, WAIT_THRESHOLDS } from '../features/approvals/wait'
import {
  filterRows,
  filtersFromParams,
  isFiltered,
  paramsFromFilters,
  QueueFilters,
  type QueueFilterState,
} from '../features/approvals/QueueFilters'
import { QueueTable } from '../features/approvals/QueueTable'
import { useApprovalQueue, useCapabilities } from '../lib/api/queries'
import { cn, num } from '../lib/format'

function Stat({
  label,
  value,
  caption,
  className,
}: {
  label: string
  value: string
  caption: string
  className?: string
}) {
  return (
    <div className="min-w-0">
      <div className="label text-fg-faint">{label}</div>
      <div className={cn('mt-1 text-title text-fg', className)}>{value}</div>
      <div className="mt-0.5 text-xs text-fg-subtle">{caption}</div>
    </div>
  )
}

function Summary({ rows, total }: { rows: QueueRow[]; total: number | null }) {
  const oldest = rows.reduce((max, row) => Math.max(max, row.waitingSeconds), 0)
  const held = rows.filter((row) => row.awaitingSecondApproval).length
  const unattributed = rows.filter((row) => row.generationSource === '').length

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Waiting"
        value={num(total ?? rows.length)}
        caption={total !== null && total !== rows.length ? `${rows.length} loaded on this page` : 'Runs held at the gate'}
      />
      <Stat
        label="Longest wait"
        value={rows.length > 0 ? waitLabel(oldest) : '—'}
        caption={rows.length > 0 ? 'Since the run reached the gate' : 'Nothing is waiting'}
        className={rows.length > 0 ? TONE_TEXT[waitTone(oldest)] : undefined}
      />
      <Stat
        label="Held for a second approver"
        value={num(held)}
        caption={held > 0 ? 'Endorsed once; a different person must approve' : 'None endorsed and held'}
      />
      <Stat
        label="No engine recorded"
        value={num(unattributed)}
        caption="Modules whose author was never written down"
        className={unattributed > 0 ? 'text-medium' : undefined}
      />
    </div>
  )
}

export default function Approvals() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])

  const capabilities = useCapabilities()
  // Only `sort` is a server-side filter. See QueueFilters for why the rest are not.
  const queue = useApprovalQueue({ sort: filters.sort })

  const page = useMemo(() => adaptQueue(queue.data), [queue.data])
  const rows = useMemo(() => filterRows(page.rows, filters), [page.rows, filters])

  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  const setFilters = (next: QueueFilterState) => setParams(paramsFromFilters(next), { replace: true })
  const filtered = isFiltered(filters)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-display text-fg">Approval gate</h1>
        <p className="max-w-3xl text-lead text-fg-muted">
          Nothing generated from a real threat reaches a named employee until a person approves it
          here. Every row is a loop run stopped between conversion and targeting, waiting on a
          decision.
        </p>
      </header>

      <Panel tone="feature">
        <Summary rows={page.rows} total={page.total} />
      </Panel>

      <QueueFilters value={filters} onChange={setFilters} />

      <AsyncBoundary
        isLoading={queue.isLoading}
        error={queue.data ? null : queue.error}
        onRetry={queue.error?.retryable ? () => void queue.refetch() : undefined}
        loadingLabel="Loading the approval queue"
        skeleton={<SkeletonTable rows={5} cols={6} />}
        isEmpty={rows.length === 0}
        empty={
          filtered ? (
            <EmptyState
              icon={BadgeCheck}
              headline="No run matches these filters"
              description={`${page.rows.length} ${page.rows.length === 1 ? 'run is' : 'runs are'} waiting at the gate, but none of them matches the filters above. Clear them to see the rest.`}
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              headline="Nothing is waiting for a decision"
              description="A run appears here when a threat has been analysed and converted into training, which is the point at which the loop stops for a human. Push a threat or a reported artifact into the loop to fill this queue."
            />
          )
        }
      >
        <Panel
          flush
          title="Runs awaiting a decision"
          subtitle={
            page.truncated
              ? `Showing ${rows.length} of ${page.total ?? '—'} waiting. The server returned one page; narrow the filters or clear them to see different runs.`
              : filtered
                ? `Showing ${rows.length} of ${page.rows.length} waiting. Filters are applied to the rows already loaded.`
                : `${rows.length} ${rows.length === 1 ? 'run' : 'runs'} waiting, longest first.`
          }
          actions={
            <Tooltip
              content={`A convention of this screen, not a policy: amber past ${WAIT_THRESHOLDS.medium / 3600}h, orange past ${WAIT_THRESHOLDS.high / 3600}h, red past ${WAIT_THRESHOLDS.critical / 3600}h. No service level in the platform defines these.`}
            >
              <span className="text-xs text-fg-faint underline decoration-dotted underline-offset-4">
                How urgency is coloured
              </span>
            </Tooltip>
          }
        >
          <QueueTable rows={rows} modelConnected={modelConnected} />
        </Panel>
      </AsyncBoundary>
    </div>
  )
}
