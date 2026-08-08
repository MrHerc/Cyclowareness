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
import { useT } from '../../lib/i18n'
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
import { type QueueRow } from '../approvals/contract'
import { provenanceOf, type ApprovalDecision } from '../../domain/types'
import { duration, formatDateTime, humanise } from '../../lib/format'
import { sortByWait } from './derive'

export type QueueScope = 'all' | 'mine'

export interface ApprovalQueuePanelProps {
  /** The whole queue, unsorted — this component owns the ordering.
   *
   * `QueueRow`, not the raw payload. The server names the verdict
   * `threat_verdict`, dates the wait from `created_at` and counts the
   * audience in `proposed_target_count`; reading the frozen type's names
   * straight off the response gave `undefined` for four of them, and the
   * approval dialog — whose entire job is to state the blast radius —
   * read "assigned to the undefined people in the proposed audience".
   * `adaptQueue` already resolves this and the Approvals page already uses
   * it; this panel was the one consumer that did not. */
  items: QueueRow[]
  /** How many runs are waiting IN TOTAL, from the server's own SQL count.
   *
   *  `items` is one page — 25 by default — so labelling the tab with
   *  `items.length` reported 25 when 60 were waiting, and an analyst who
   *  cleared the page believed they had cleared the gate. Null when the server
   *  did not say, in which case the label falls back to what is on screen. */
  total: number | null
  /** True when the server says more runs exist than were returned. */
  truncated: boolean
  /** The subset naming the signed-in analyst. */
  mine: QueueRow[]
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
  item: QueueRow
  decision: Extract<ApprovalDecision, 'approve' | 'reject'>
}

function audience(count: number | null): string {
  // `null` is "the server did not report an audience size", which is not zero
  // and must never be rendered as a number on the screen where someone signs
  // off on who is about to be contacted.
  if (count === null) return 'audience size not reported'
  return `${count} ${count === 1 ? 'person' : 'people'} proposed`
}

function QueueEntry({
  item,
  modelConnected,
  canDecide,
  busy,
  onRequest,
}: {
  item: QueueRow
  modelConnected: boolean | undefined
  canDecide: boolean
  busy: boolean
  onRequest: (pending: PendingDecision) => void
}) {
  const t = useT()
  const provenance = provenanceOf(item.generationSource)

  return (
    <li className="rounded-control border border-line-subtle bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {item.severity ? <Badge status={item.severity} size="sm" /> : null}
            <h3 className="text-h text-fg">
              {item.moduleTitle ?? t('p.training-content-not-generated-yet')}
            </h3>
          </div>

          <p className="text-sm text-fg-muted">
            Converted from{' '}
            {item.threatId !== null ? (
              <Link
                to={`/threats/${item.threatId}`}
                className="text-brand-fg underline-offset-4 hover:underline"
              >
                {item.threatTitle}
              </Link>
            ) : (
              <span className="text-fg">{item.threatTitle}</span>
            )}
            {[item.severityBasis, item.threatType, item.verdict]
              .filter((part): part is string => Boolean(part))
              .map((part) => ` · ${humanise(part)}`)
              .join('')}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lead tabular-nums text-fg">{duration(item.waitingSeconds * 1000)}</p>
          {item.waitingSince ? (
            <p className="text-xs text-fg-faint">
              waiting since {formatDateTime(item.waitingSince)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <AIProvenanceBadge
          provenance={provenance}
          generationSource={item.generationSource}
          modelConnected={modelConnected}
        />

        {item.sanitizationStatus ? (
          <Badge status={item.sanitizationStatus} size="sm" />
        ) : (
          <span className="rounded-chip border border-dashed border-line px-2 py-0.5 text-xs text-fg-faint">
            {t('u.sanitisation-not-recorded')}
          </span>
        )}

        <span className="text-sm text-fg-muted">{audience(item.proposedTargets)}</span>

        {/* "Unassigned" is only true where assignment exists. This deployment
            has no assignment concept — nothing ever writes `assigned_analyst` —
            so printing it on every card states a status the product cannot
            hold, and implies a queue somebody could claim from. Shown only
            when the field carries something. */}
        {item.assignedAnalyst ? (
          <span className="text-sm text-fg-subtle">Assigned to {item.assignedAnalyst}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link to={`/approvals/${item.runId}`}>Review run #{item.runId}</Link>
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
            {t('u.your-role-can-read-this-queue-but')}
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
  items: QueueRow[]
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
        <QueueEntry
          key={item.runId}
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
  const title = item.moduleTitle ?? 'the generated content'
  // `null` means the server did not say, which must never render as a number.
  const people =
    item.proposedTargets === null
      ? 'the proposed audience, whose size the server did not report'
      : `${item.proposedTargets} ${item.proposedTargets === 1 ? 'person' : 'people'}`
  const audited = 'The decision is written to the audit log against your account.'
  if (decision === 'approve') {
    return `Run #${item.runId} moves past the human gate and "${title}" is assigned to ${people}. ${audited}`
  }
  return `Run #${item.runId} stops at the gate. "${title}" is not assigned and nothing reaches an employee. ${audited}`
}

export function ApprovalQueuePanel({
  items,
  total,
  truncated,
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
  const t = useT()
  const [pending, setPending] = useState<PendingDecision | null>(null)

  // Does assignment mean anything here? Read from the data rather than from a
  // flag, so a deployment that starts populating `assigned_analyst` gets the
  // tab back without a release.
  const assignmentInUse = items.some((item) => item.assignedAnalyst !== null)

  const confirm = async () => {
    if (!pending) return
    try {
      await onDecide(pending.item.runId, pending.decision)
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
      title={t('cc.awaitingApproval')}
      subtitle={t('x.sorted-by-how-long-each')}
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-the-approval-queue')}
        skeleton={
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <SkeletonRow key={row} className="rounded-control border border-line-subtle" />
            ))}
          </div>
        }
      >
        {/* THE TAB IS OFFERED ONLY WHEN IT CAN ANSWER. Nothing in this product
            assigns a run to an analyst, so "Assigned to you" was permanently
            (0) — a filter that looks like a queue somebody forgot to work,
            beside a real one. It appears the moment a deployment does populate
            `assigned_analyst`, which is the same rule QueueTable already
            applies to its analyst column. */}
        <Tabs
          value={assignmentInUse ? scope : 'all'}
          onValueChange={(value) => onScopeChange(value === 'mine' ? 'mine' : 'all')}
        >
          <TabsList>
            <TabsTrigger value="all">Whole queue ({total ?? items.length})</TabsTrigger>
            {assignmentInUse ? (
              <TabsTrigger value="mine">Assigned to you ({mine.length})</TabsTrigger>
            ) : null}
          </TabsList>

          {truncated ? (
            <p className="mt-2 text-xs text-fg-faint">
              Showing the {items.length} that have waited longest. Open the approvals queue to
              work the rest.
            </p>
          ) : null}

          <TabsContent value="all">
            <QueueList
              items={items}
              emptyHeadline="The gate is clear"
              emptyDescription={t('u.items-appear-here-when-a-loop-run')}
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
              emptyDescription={t('u.items-appear-here-once-an-analyst-is')}
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
