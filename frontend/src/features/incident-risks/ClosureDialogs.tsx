/**
 * Closing and reopening — both cost a sentence.
 *
 * The server refuses either without a written reason, and that is not a
 * validation quirk to be worked around: a risk that vanished with no stated
 * justification is indistinguishable from one that was quietly deleted, and
 * this record exists precisely so that cannot happen.
 *
 * The closure dialog quotes the criteria the risk was opened with, directly
 * above the box. Somebody attesting that the criteria were met should be able
 * to read what they were without leaving the dialog to find out.
 */

import { useState } from 'react'
import { Button, Dialog, Textarea } from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { useIncidentRiskAction } from '../../lib/api/mutations'
import type { IncidentRiskDetail } from '../../domain/types'
import type { SubjectRollup } from './vocabulary'

interface DialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ============================================================================
   Close
   ========================================================================== */

export interface CloseRiskDialogProps extends DialogShellProps {
  risk: IncidentRiskDetail
  rollup: SubjectRollup
}

export function CloseRiskDialog({ risk, rollup, open, onOpenChange }: CloseRiskDialogProps) {
  const close = useIncidentRiskAction('close')
  const [note, setNote] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  const outstanding = rollup.assigned + rollup.awaitingReview

  const dismiss = (next: boolean) => {
    if (close.isPending) return
    if (!next) {
      setNote('')
      setFailure(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    setFailure(null)
    try {
      await close.mutateAsync({ id: risk.id, body: { closure_note: note.trim() } })
      dismiss(false)
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : 'The risk could not be closed. Nothing changed.',
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={dismiss}
      title="Close this incident risk"
      description="The note is the record that the closure criteria were met. It cannot be left blank."
      footer={
        <>
          <Button variant="ghost" onClick={() => dismiss(false)} disabled={close.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={close.isPending}
            disabled={note.trim().length === 0}
            onClick={() => void submit()}
          >
            Close the risk
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {failure && (
          <p
            role="alert"
            className="rounded-control border border-critical/35 bg-critical/12 px-3 py-2 text-sm text-critical"
          >
            {failure}
          </p>
        )}

        <section className="rounded-control border border-line-subtle bg-base px-3 py-2.5">
          <h3 className="label text-fg-subtle">Closure criteria, as written when this was opened</h3>
          <p className="mt-1.5 text-sm text-fg">
            {risk.closure_criteria?.trim() ||
              'No closure criteria were recorded, so there is nothing to check this note against.'}
          </p>
        </section>

        {outstanding > 0 && (
          <p className="rounded-control border border-medium/35 bg-medium/12 px-3 py-2 text-sm text-medium">
            {outstanding} {outstanding === 1 ? 'subject is' : 'subjects are'} still outstanding.
            Closing over them is allowed, and the audit entry will say how many there were.
          </p>
        )}

        <Textarea
          label="Closure note"
          required
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="State how the criteria above were met. This is what an auditor reads."
        />
      </div>
    </Dialog>
  )
}

/* ============================================================================
   Reopen
   ========================================================================== */

export interface ReopenRiskDialogProps extends DialogShellProps {
  risk: IncidentRiskDetail
}

export function ReopenRiskDialog({ risk, open, onOpenChange }: ReopenRiskDialogProps) {
  const reopen = useIncidentRiskAction('reopen')
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  const dismiss = (next: boolean) => {
    if (reopen.isPending) return
    if (!next) {
      setReason('')
      setFailure(null)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    setFailure(null)
    try {
      await reopen.mutateAsync({ id: risk.id, body: { reason: reason.trim() } })
      dismiss(false)
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : 'The risk could not be reopened. Nothing changed.',
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={dismiss}
      title="Reopen this incident risk"
      description="Reopening clears the closure note and raises the reopened count. Both are kept in the audit trail."
      footer={
        <>
          <Button variant="ghost" onClick={() => dismiss(false)} disabled={reopen.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={reopen.isPending}
            disabled={reason.trim().length === 0}
            onClick={() => void submit()}
          >
            Reopen
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {failure && (
          <p
            role="alert"
            className="rounded-control border border-critical/35 bg-critical/12 px-3 py-2 text-sm text-critical"
          >
            {failure}
          </p>
        )}

        {risk.reopened_count > 0 && (
          <p className="text-sm text-fg-subtle">
            This risk has already been reopened {risk.reopened_count}{' '}
            {risk.reopened_count === 1 ? 'time' : 'times'}. Reopening again makes it{' '}
            {risk.reopened_count + 1}.
          </p>
        )}

        {risk.closure_note && (
          <section className="rounded-control border border-line-subtle bg-base px-3 py-2.5">
            <h3 className="label text-fg-subtle">The closure note that did not hold</h3>
            <p className="mt-1.5 text-sm text-fg">{risk.closure_note}</p>
          </section>
        )}

        <Textarea
          label="Reason for reopening"
          required
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="Say why the closure did not hold. The people named by this risk may be asked for more work on the strength of it."
        />
      </div>
    </Dialog>
  )
}
