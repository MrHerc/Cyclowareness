/**
 * The human approval gate, as it appears on the run page.
 *
 * When the run is waiting, this is the loudest thing on the screen and the page
 * hoists it above everything else — the whole product claim is that nothing
 * reaches an employee without a person deciding here, so the decision cannot be
 * something you scroll to find.
 *
 * The decision is never optimistic. An approval that appears to have happened
 * and silently did not is the one failure this product cannot afford, so the
 * dialog stays open, and busy, until the server answers.
 */

import { useT } from '../../../lib/i18n'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { ApprovalDecision, LoopStatus } from '../../../domain/types'
import { APPROVAL_GATE_AFTER_STAGE } from '../../../domain/types'
import type { LoopGateRecord } from '../../../components/loop'
import { formatDateTime, timeAgo } from '../../../lib/format'
import { ConfirmationDialog } from '../../../components/states'
import { Button, Panel, Textarea, useToast } from '../../../components/ui'
import { useApprovalDecision } from '../../../lib/api/mutations'

export interface ApprovalGatePanelProps {
  runId: number
  status: LoopStatus
  currentStage: number
  gate: LoopGateRecord | null
  /** True when the audit query has not answered yet — do not claim "no record". */
  gateUnknown: boolean
  moduleTitle: string | null
  proposedTargets: number
  canDecide: boolean
}

const DECISION_LABEL: Record<ApprovalDecision, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  request_revision: 'Revision requested',
}

export function ApprovalGatePanel({
  runId,
  status,
  currentStage,
  gate,
  gateUnknown,
  moduleTitle,
  proposedTargets,
  canDecide,
}: ApprovalGatePanelProps) {
  const t = useT()
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null)
  const toast = useToast()

  // Callbacks are passed per call, not to the hook: options given to
  // `useApprovalDecision` replace its own `onSuccess`, which is what invalidates
  // the loop, the queue, the dashboard and the audit trail after a decision.
  const decide = useApprovalDecision()

  const submit = (decision: 'approve' | 'reject') => {
    decide.mutate(
      { runId, decision, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setPending(null)
          setComment('')
          toast.show({
            title: decision === 'approve' ? `Run ${runId} approved` : `Run ${runId} rejected`,
            description:
              decision === 'approve'
                ? t('p.the-loop-has-been-released-to')
                : t('p.the-module-was-rejected-and-the'),
            tone: decision === 'approve' ? 'success' : 'info',
          })
        },
        onError: (error) => {
          setPending(null)
          toast.show({
            title: t('p.the-decision-was-not-recorded'),
            description: error.message,
            tone: 'error',
          })
        },
      },
    )
  }

  const waiting = status === 'awaiting_approval'
  const released = !waiting && currentStage > APPROVAL_GATE_AFTER_STAGE

  const body = waiting ? (
    <>
      <p className="text-body text-fg">
        This run is holding at the gate. {moduleTitle ? <>{t('u.the-module')} </> : <>A module </>}
        {moduleTitle ? <span className="text-fg">“{moduleTitle}”</span> : null} and{' '}
        {proposedTargets} proposed target{proposedTargets === 1 ? '' : 's'} are waiting for a human
        decision. No employee is assigned anything until one is given.
      </p>

      <Textarea
        label={t('p.decision-comment')}
        hint={t('p.kept-on-the-audit-entry-optional')}
        className="mt-4"
        rows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        disabled={decide.isPending}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary">
          <Link to={`/approvals/${runId}`}>{t('u.open-the-full-review')}</Link>
        </Button>
        {canDecide ? (
          <>
            <Button
              variant="primary"
              onClick={() => setPending('approve')}
              disabled={decide.isPending}
            >
              {t('u.approve-and-release')}
            </Button>
            <Button
              variant="danger"
              onClick={() => setPending('reject')}
              disabled={decide.isPending}
            >
              Reject
            </Button>
          </>
        ) : (
          <p className="text-sm text-fg-subtle">{t('p.your-role-can-read-this-queue')}</p>
        )}
      </div>
    </>
  ) : gate?.decision ? (
    <>
      <p className="text-body text-fg">
        {DECISION_LABEL[gate.decision]}
        {gate.actor ? ` by ${gate.actor}` : ''} · {formatDateTime(gate.at)} ({timeAgo(gate.at)})
      </p>
      {gate.comment?.trim() ? (
        <p className="mt-2 text-body text-fg-muted">{gate.comment.trim()}</p>
      ) : (
        <p className="mt-2 text-sm text-fg-subtle">{t('p.the-decision-was-recorded-without-a')}</p>
      )}
      <div className="mt-4">
        <Button asChild variant="secondary" size="sm">
          <Link to={`/approvals/${runId}`}>{t('u.open-the-review-workspace')}</Link>
        </Button>
      </div>
    </>
  ) : gateUnknown ? (
    <p className="text-body text-fg-muted">{t('p.reading-the-decision-from-the-audit')}</p>
  ) : released ? (
    <p className="text-body text-fg-muted">{t('p.released-by-a-person-the-run')}</p>
  ) : (
    <p className="text-body text-fg-muted">{t('p.not-reached-nothing-has-been-proposed-2')}</p>
  )

  return (
    <>
      <Panel
        tone={waiting ? 'feature' : 'default'}
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {t('u.approval-gate-2')}
          </span>
        }
        subtitle={t('x.between-conversion-and-targeting-the')}
      >
        {body}
      </Panel>

      <ConfirmationDialog
        open={pending === 'approve'}
        onOpenChange={(open) => setPending(open ? 'approve' : null)}
        title={`Approve run ${runId}`}
        description={`Approving releases the module to ${proposedTargets} proposed target${
          proposedTargets === 1 ? '' : 's'
        }. Targeting is recomputed at execution, so the final audience can differ if a risk score has moved since this list was drawn.`}
        confirmLabel={t('p.approve-and-release')}
        busy={decide.isPending}
        onConfirm={() => submit('approve')}
      />

      <ConfirmationDialog
        open={pending === 'reject'}
        onOpenChange={(open) => setPending(open ? 'reject' : null)}
        tone="danger"
        title={`Reject run ${runId}`}
        description={t('x.rejecting-marks-the-module-rejected')}
        confirmLabel={t('p.reject-the-module')}
        busy={decide.isPending}
        onConfirm={() => submit('reject')}
      />
    </>
  )
}
