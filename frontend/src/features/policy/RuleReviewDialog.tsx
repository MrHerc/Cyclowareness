/**
 * The human gate in front of a machine-proposed rule.
 *
 * Two things this dialog refuses to let a reviewer skip.
 *
 * **Activation is a change to the control set, and it says so.** The API writes
 * an immutable `PolicyVersion` snapshot on activation, because an auditor's
 * first question is "what did the policy say on the day that finding was
 * raised". The reviewer is told that before they click, not after.
 *
 * **Rejection needs a reason.** The API returns 422 without one — a discarded
 * rule with no stated reason is indistinguishable from one nobody read — so the
 * control is disabled until there is one rather than letting the server refuse.
 */

import { useEffect, useState } from 'react'
import { Dialog, Button, Textarea, useToast } from '../../components/ui'
import type { PolicyRule } from '../../domain/types'
import { useReviewRule } from '../../lib/api/mutations'
import { RULE_TYPE_LABELS } from './vocabulary'

export type RuleDecision = 'activate' | 'reject'

export interface RuleReviewDialogProps {
  rule: PolicyRule | null
  decision: RuleDecision
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RuleReviewDialog({ rule, decision, open, onOpenChange }: RuleReviewDialogProps) {
  const [note, setNote] = useState('')
  const toast = useToast()
  const review = useReviewRule()

  // A note typed for one rule must not travel to the next one.
  useEffect(() => {
    if (open) setNote('')
  }, [open, rule?.id, decision])

  if (!rule) return null

  const rejecting = decision === 'reject'
  const noteMissing = rejecting && note.trim().length === 0

  const submit = () => {
    review.mutate(
      { ruleId: rule.id, decision, note: note.trim() },
      {
        onSuccess: () => {
          toast.show({
            title: rejecting ? 'Rule rejected' : 'Rule activated',
            description: rejecting
              ? `${rule.rule_key} will not be checked against. The reason is in the audit trail.`
              : `${rule.rule_key} is now active, and a version snapshot of the rule set was written.`,
            tone: rejecting ? 'info' : 'success',
          })
          onOpenChange(false)
        },
        onError: (error) => {
          toast.show({
            title: 'The server refused this decision',
            description: error.message,
            tone: 'error',
          })
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={rejecting ? 'Reject this proposed rule' : 'Activate this proposed rule'}
      description={
        rejecting
          ? 'A rejected rule was never in force, so no version snapshot is written. The reason is recorded in the audit trail.'
          : 'Activating changes the set of rules this organisation is checked against, so the API writes an immutable snapshot of the rule set at this moment.'
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={review.isPending}>
            Cancel
          </Button>
          <Button
            variant={rejecting ? 'danger' : 'primary'}
            onClick={submit}
            loading={review.isPending}
            disabled={noteMissing}
          >
            {rejecting ? 'Reject rule' : 'Activate rule'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-control border border-line-subtle bg-base p-3">
          <p className="tech text-fg-subtle">{rule.rule_key}</p>
          <p className="mt-1.5 text-body text-fg">{rule.statement}</p>
          <p className="mt-2 text-xs text-fg-faint">
            {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
            {rule.technology ? ` · ${rule.technology}` : ''}
            {rule.version_spec ? ` · ${rule.version_spec}` : ''}
          </p>
        </div>

        {rule.evidence_quote ? (
          <blockquote className="border-l-2 border-brand/40 pl-3">
            <p className="text-sm italic text-fg-muted">“{rule.evidence_quote}”</p>
            {rule.evidence_location ? (
              <footer className="mt-1 text-xs text-fg-faint">{rule.evidence_location}</footer>
            ) : null}
          </blockquote>
        ) : (
          <p className="text-sm text-fg-faint">
            No passage was recorded for this rule, so there is nothing to check the statement
            against. Consider rejecting it and entering the control by hand.
          </p>
        )}

        <Textarea
          label={rejecting ? 'Why this rule is being rejected' : 'Reviewer note (optional)'}
          required={rejecting}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint={
            rejecting
              ? 'Required. The API refuses a rejection without a stated reason.'
              : 'Recorded on the version snapshot alongside your name.'
          }
          error={noteMissing && note.length > 0 ? 'A reason is required.' : null}
        />
      </div>
    </Dialog>
  )
}
