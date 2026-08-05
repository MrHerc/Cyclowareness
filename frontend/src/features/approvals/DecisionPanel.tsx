/**
 * The decision itself.
 *
 * Three rules this panel enforces in the interface rather than only in the API.
 *
 * - **A rejection or a revision request needs a comment.** The server refuses
 *   without one; returning generated content to the queue without saying what
 *   is wrong with it leaves nothing to act on. The control stays disabled and
 *   says why, instead of letting someone discover it as a 422.
 *
 * - **Approving is confirmed, and the confirmation counts the people.** The
 *   blast radius of this button is named employees receiving content — the
 *   dialog states how many, by name of the fact rather than by adjective.
 *
 * - **An action without an endpoint is not a button that does nothing.**
 *   "Save draft" is honestly local to this browser and labelled as such.
 *   "Escalate" has no backing at all, so it is disabled and says so.
 */

import { AlertTriangle, Check, MessageSquareWarning, Save, SendHorizontal, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { ConfirmationDialog } from '../../components/states'
import { Button, Panel, Separator, Textarea, Tooltip } from '../../components/ui'
import { formatDateTime } from '../../lib/format'

export type DecisionKind =
  | 'approve'
  | 'approve_with_edits'
  | 'second_approval'
  | 'request_revision'
  | 'reject'

export interface DecisionPanelProps {
  awaitingApproval: boolean
  canDecide: boolean
  audienceCount: number
  hasModule: boolean
  /** Unsaved module edits are pending — "approve with edits" saves them first. */
  dirty: boolean
  failedChecks: number
  comment: string
  onCommentChange: (next: string) => void
  onDecide: (kind: DecisionKind) => void
  busy: boolean
  /** The server's message from the last decision, announced when it lands. */
  result: string | null
  error: string | null
  onSaveDraft: () => void
  onDiscardDraft: () => void
  draftSavedAt: string | null
}

interface PendingAction {
  kind: DecisionKind
  title: string
  description: string
  confirmLabel: string
  tone: 'default' | 'danger'
}

export function DecisionPanel({
  awaitingApproval,
  canDecide,
  audienceCount,
  hasModule,
  dirty,
  failedChecks,
  comment,
  onCommentChange,
  onDecide,
  busy,
  result,
  error,
  onSaveDraft,
  onDiscardDraft,
  draftSavedAt,
}: DecisionPanelProps) {
  const [pending, setPending] = useState<PendingAction | null>(null)

  const commented = comment.trim().length > 0
  const locked = !awaitingApproval || !canDecide

  const audienceSentence =
    audienceCount === 0
      ? 'No employee is currently selected, so approving advances the run with nothing to assign.'
      : `${audienceCount} ${audienceCount === 1 ? 'person' : 'people'} will be assigned this module as soon as the run advances.`

  const approveAction = (kind: 'approve' | 'approve_with_edits'): PendingAction => ({
    kind,
    title: kind === 'approve' ? 'Approve this content' : 'Save edits and approve',
    description:
      (kind === 'approve_with_edits'
        ? 'Your edits are written to the module first, which marks it analyst-edited. '
        : '') +
      audienceSentence +
      (failedChecks > 0
        ? ` ${failedChecks} safety ${failedChecks === 1 ? 'check has' : 'checks have'} failed on this module.`
        : ''),
    confirmLabel: kind === 'approve' ? 'Approve' : 'Save and approve',
    tone: failedChecks > 0 ? 'danger' : 'default',
  })

  const rejectAction: PendingAction = {
    kind: 'reject',
    title: 'Reject this content',
    description:
      'The module is marked rejected and the run is closed as failed-by-review. Nothing is assigned to anyone, and the run cannot be reopened from this screen.',
    confirmLabel: 'Reject',
    tone: 'danger',
  }

  return (
    <>
      <Panel
        title="Decision"
        headingLevel={2}
        tone="feature"
        subtitle={
          !awaitingApproval
            ? 'This run has already left the gate. The record below is read-only.'
            : !canDecide
              ? 'Your role can read this review but cannot record a decision.'
              : 'Recorded against your name in the audit trail.'
        }
        bodyClassName="space-y-4"
      >
        <Textarea
          label="Analyst comment"
          rows={4}
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          disabled={locked || busy}
          placeholder="What you checked, what you changed, or what is wrong with it."
          hint="Required for a rejection or a revision request. Stored with the decision in the audit trail."
        />

        <div className="grid gap-2">
          {dirty ? (
            <Button
              variant="primary"
              block
              icon={<Check className="size-4" aria-hidden="true" />}
              disabled={locked || busy || !hasModule}
              onClick={() => setPending(approveAction('approve_with_edits'))}
            >
              Approve with edits
            </Button>
          ) : (
            <Button
              variant="primary"
              block
              icon={<Check className="size-4" aria-hidden="true" />}
              disabled={locked || busy || !hasModule}
              onClick={() => setPending(approveAction('approve'))}
            >
              Approve
            </Button>
          )}

          <Button
            variant="secondary"
            block
            icon={<UserPlus className="size-4" aria-hidden="true" />}
            disabled={locked || busy || !hasModule}
            loading={busy}
            onClick={() => onDecide('second_approval')}
          >
            Require a second approval
          </Button>

          <Tooltip
            content={
              commented
                ? 'Records your objection and leaves the run at the gate for editing.'
                : 'Add a comment first — a revision request without one leaves nothing to act on.'
            }
          >
            <span className="block">
              <Button
                variant="outline"
                block
                icon={<MessageSquareWarning className="size-4" aria-hidden="true" />}
                disabled={locked || busy || !commented}
                onClick={() => onDecide('request_revision')}
              >
                Request revision
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            content={
              commented
                ? 'Closes the run as failed-by-review. Nothing is assigned.'
                : 'Add a comment first — the server refuses a rejection without a reason.'
            }
          >
            <span className="block">
              <Button
                variant="danger"
                block
                icon={<X className="size-4" aria-hidden="true" />}
                disabled={locked || busy || !commented}
                onClick={() => setPending(rejectAction)}
              >
                Reject
              </Button>
            </span>
          </Tooltip>
        </div>

        {/* Both controls above are blocked by the same condition, and the only
            statement of it was a tooltip on a non-focusable span wrapping a
            disabled button — a disabled button cannot take focus, so there was
            no keyboard path to the explanation at all, and a mouse user had to
            hover a dead control to discover why it was dead.

            Said once, in text, where it costs nobody a hover. The tooltips stay
            for the enabled state, where they describe what the action DOES. */}
        {!commented && !locked ? (
          <p className="text-sm text-fg-subtle">
            Rejecting or requesting a revision needs a comment first — the server
            refuses either without a reason, and a decision with nothing to act on
            helps no one.
          </p>
        ) : null}

        <div aria-live="polite" className="empty:hidden">
          {result && (
            <p className="rounded-control border border-safe/35 bg-safe/8 px-3 py-2 text-sm text-fg">
              {result}
            </p>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-control border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical"
          >
            {error}
          </p>
        )}

        <Separator fade />

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Save className="size-3.5" aria-hidden="true" />}
              onClick={onSaveDraft}
              disabled={busy}
            >
              Save draft
            </Button>
            {draftSavedAt && (
              <Button variant="ghost" size="sm" onClick={onDiscardDraft} disabled={busy}>
                Discard draft
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-faint">
            {draftSavedAt
              ? `Draft saved in this browser at ${formatDateTime(draftSavedAt)}. It is on this device only — nobody else reviewing this run can see it.`
              : 'Keeps your comment and unsaved edits in this browser. There is no draft endpoint, so a draft never leaves this device.'}
          </p>
        </div>

        {/* Deliberately not a control. There is no escalation endpoint, and a
            disabled button still teaches a reader that the capability exists
            and is merely switched off. */}
        <div className="flex items-start gap-2 rounded-control border border-line-subtle px-3 py-2">
          <SendHorizontal className="mt-0.5 size-3.5 shrink-0 text-fg-faint" aria-hidden="true" />
          <p className="text-xs text-fg-faint">
            <span className="text-fg-subtle">Escalation is not available.</span> This deployment has
            no escalation route — there is no on-call rota and no owner to hand a run to. Requiring
            a second approval is the control that does exist.
          </p>
        </div>

        {failedChecks > 0 && awaitingApproval && (
          <p className="flex items-start gap-2 text-xs text-critical">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {failedChecks} safety {failedChecks === 1 ? 'check has' : 'checks have'} failed. Approving
            does not clear them.
          </p>
        )}
      </Panel>

      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel ?? 'Confirm'}
        tone={pending?.tone ?? 'default'}
        busy={busy}
        onConfirm={() => {
          if (pending) onDecide(pending.kind)
        }}
      />
    </>
  )
}
