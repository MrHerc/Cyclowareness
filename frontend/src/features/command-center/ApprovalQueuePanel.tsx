/**
 * The human approval gate, as a working queue.
 *
 * This is the most important list in the product: it is the one place where a
 * person decides whether a real threat becomes training aimed at named
 * colleagues. Four decisions follow from that.
 *
 * 1. **Longest wait first, always.** Not newest, not highest severity. The item
 *    that has waited longest is the one the gate is failing, and severity is
 *    already visible on every row for the analyst who wants to triage by it.
 *
 * 2. **Provenance is on the row, not behind a click.** An analyst approving
 *    content has to know whether a model wrote it or a template did before they
 *    put their name on it.
 *
 * 3. **Inline decisions still confirm, and the dialog states the blast radius.**
 *    The number of people who will receive the training is in the confirmation
 *    text, because "approve" on a row is otherwise an abstraction.
 *
 * 4. **The dialog closes when the server agrees, never before.** The decision is
 *    awaited; a failure leaves the dialog open with the row untouched.
 */

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import { AsyncBoundary, ConfirmationDialog, EmptyState, SkeletonRow } from '../../components/states'
import {
  Badge,
  Button,
  Panel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui'
import { provenanceOf, type ApprovalDecision, type ApprovalQueueItem } from '../../domain/types'
import { duration, formatDateTime, humanise } from '../../lib/format'
import { sortByWait } from './derive'

export type QueueScope = 'all' | 'mine'

export interface ApprovalQueuePanelProps {
  /** The whole queue, unsorted — this component owns the ordering. */
  items: ApprovalQueueItem[]
  /** The subset naming the signed-in analyst. */
  mine: ApprovalQueueItem[]
  scope: QueueScope
  onScopeChange: (scope: QueueScope) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** `undefined` until capabilities answer — the badge then says nothing about a model. */
  modelConnected: boolean | undefined
  canDecide: boolean
  /** Resolves when the server has accepted the decision; rejects otherwise. */
  onDecide: (runId: number, decision: ApprovalDecision) => Promise<void>
  busy: boolean
}

interface PendingDecision {
  item: ApprovalQueueItem
  decision: Extract<ApprovalDecision, 'approve' | 'reject'>
}

function audience(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'} proposed`
}

function QueueRow({
  item,
  modelConnected,
  canDecide,
  busy,
  onRequest,
}: {
  item: ApprovalQueueItem
  modelConnected: boolean | undefined
  canDecide: boolean
  busy: boolean
  onRequest: (pending: PendingDecision) => void
}) {
  const provenance = provenanceOf(item.generation_source)

  return (
    <li className="rounded-control border border-line-subtle bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {item.severity ? <Badge status={item.severity} size="sm" /> : null}
            <h3 className="text-h text-fg">
              {item.module_title ?? 'Training content not generated yet'}
            </h3>
          </div>

          <p className="text-sm text-fg-muted">
            Converted from{' '}
            {item.threat_id !== null ? (
              <Link
                to={`/threats/${item.threat_id}`}
                className="text-brand-fg underline-offset-4 hover:underline"
              >
                {item.threat_title}
              </Link>
            ) : (
              <span className="text-fg">{item.threat_title}</span>
            )}
            {[item.threat_source, item.threat_type, item.verdict]
              .filter((part): part is string => Boolean(part))
              .map((part) => ` · ${humanise(part)}`)
              .join('')}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lead tabular-nums text-fg">{duration(item.waiting_seconds * 1000)}</p>
          <p className="text-xs text-fg-faint">waiting since {formatDateTime(item.waiting_since)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <AIProvenanceBadge
          provenance={provenance}
          generationSource={item.generation_source}
          modelConnected={modelConnected}
        />

        {item.sanitization_status ? (
          <Badge status={item.sanitization_status} size="sm" />
        ) : (
          <span className="rounded-chip border border-dashed border-line px-2 py-0.5 text-xs text-fg-faint">
            Sanitisation not recorded
          </span>
        )}

        <span className="text-sm text-fg-muted">{audience(item.proposed_targets)}</span>

        <span className="text-sm text-fg-subtle">
          {item.assigned_analyst ? `Assigned to ${item.assigned_analyst}` : 'Unassigned'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link to={`/approvals/${item.run_id}`}>Review run #{item.run_id}</Link>
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!canDecide || busy}
          onClick={() => onRequest({ item, decision: 'approve' })}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canDecide || busy}
          onClick={() => onRequest({ item, decision: 'reject' })}
        >
          Reject
        </Button>
        {canDecide ? null : (
          <span className="text-xs text-fg-faint">
            Your role can read this queue but cannot decide on it.
          </span>
        )}
      </div>
    </li>
  )
}

function QueueList({
  items,
  emptyHeadline,
  emptyDescription,
  modelConnected,
  canDecide,
  busy,
  onRequest,
}: {
  items: ApprovalQueueItem[]
  emptyHeadline: string
  emptyDescription: string
  modelConnected: boolean | undefined
  canDecide: boolean
  busy: boolean
  onRequest: (pending: PendingDecision) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState compact icon={ShieldCheck} headline={emptyHeadline} description={emptyDescription} />
    )
  }

  return (
    <ul className="space-y-3">
      {sortByWait(items).map((item) => (
        <QueueRow
          key={item.run_id}
          item={item}
          modelConnected={modelConnected}
          canDecide={canDecide}
          busy={busy}
          onRequest={onRequest}
        />
      ))}
    </ul>
  )
}

function describe(pending: PendingDecision): string {
  const { item, decision } = pending
  const title = item.module_title ?? 'the generated content'
  const people = `${item.proposed_targets} ${item.proposed_targets === 1 ? 'person' : 'people'}`
  const audited = 'The decision is written to the audit log against your account.'
  if (decision === 'approve') {
    return `Run #${item.run_id} moves past the human gate and "${title}" is assigned to the ${people} in the proposed audience. ${audited}`
  }
  return `Run #${item.run_id} stops at the gate. "${title}" is not assigned and nothing reaches an employee. ${audited}`
}

export function ApprovalQueuePanel({
  items,
  mine,
  scope,
  onScopeChange,
  isLoading,
  error,
  onRetry,
  modelConnected,
  canDecide,
  onDecide,
  busy,
}: ApprovalQueuePanelProps) {
  const [pending, setPending] = useState<PendingDecision | null>(null)

  const confirm = async () => {
    if (!pending) return
    try {
      await onDecide(pending.item.run_id, pending.decision)
      setPending(null)
    } catch {
      // The page raises a toast from the mutation's own error handler. Leaving
      // the dialog open keeps the analyst where they were rather than dropping
      // them onto a queue that quietly did nothing.
    }
  }

  return (
    <Panel
      tone="feature"
      title="Awaiting human approval"
      subtitle="Sorted by how long each item has waited. Nothing below has reached an employee."
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading the approval queue"
        skeleton={
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <SkeletonRow key={row} className="rounded-control border border-line-subtle" />
            ))}
          </div>
        }
      >
        <Tabs
          value={scope}
          onValueChange={(value) => onScopeChange(value === 'mine' ? 'mine' : 'all')}
        >
          <TabsList>
            <TabsTrigger value="all">Whole queue ({items.length})</TabsTrigger>
            <TabsTrigger value="mine">Assigned to you ({mine.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <QueueList
              items={items}
              emptyHeadline="The gate is clear"
              emptyDescription="Items appear here when a loop run finishes conversion and needs a person to release it into targeting."
              modelConnected={modelConnected}
              canDecide={canDecide}
              busy={busy}
              onRequest={setPending}
            />
          </TabsContent>

          <TabsContent value="mine">
            <QueueList
              items={mine}
              emptyHeadline="Nothing is assigned to you"
              emptyDescription="Items appear here once an analyst is named on them. Unassigned work stays in the whole queue."
              modelConnected={modelConnected}
              canDecide={canDecide}
              busy={busy}
              onRequest={setPending}
            />
          </TabsContent>
        </Tabs>
      </AsyncBoundary>

      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={pending?.decision === 'reject' ? 'Reject this content' : 'Approve this content'}
        description={pending ? describe(pending) : ''}
        confirmLabel={pending?.decision === 'reject' ? 'Reject' : 'Approve'}
        tone={pending?.decision === 'reject' ? 'danger' : 'default'}
        onConfirm={() => void confirm()}
        busy={busy}
      />
    </Panel>
  )
}
