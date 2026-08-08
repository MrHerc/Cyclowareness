/**
 * A named human answers an appeal.
 *
 * The learner's words are shown VERBATIM and first. The analyst is answering a
 * person, not clearing a row, and paraphrasing what somebody said in order to
 * fit it into a table cell is how an appeal process becomes a formality.
 *
 * Withdrawing is a deliberate, separate choice rather than the default action of
 * a "resolve" button. Both directions are real outcomes: the plan can stand with
 * an explanation, or it can be rescinded. What is NOT offered is closing the
 * dispute without writing anything — the answer is required, because the learner
 * reads it.
 */

import { useT } from '../../lib/i18n'
import { useEffect, useState } from 'react'
import type { RemediationPlan } from '../../domain/types'
import { Button, Checkbox, Dialog, Textarea } from '../../components/ui'
import { humanise } from '../../lib/format'

export interface DisputeResolutionDialogProps {
  /** Null when nothing is being answered. */
  plan: RemediationPlan | null
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (resolution: string, withdraw: boolean) => Promise<void>
}

export function DisputeResolutionDialog({
  plan,
  busy,
  onOpenChange,
  onSubmit,
}: DisputeResolutionDialogProps) {
  const t = useT()
  const [resolution, setResolution] = useState('')
  const [withdraw, setWithdraw] = useState(false)

  // Reset per plan, so an answer typed for one dispute can never be submitted
  // against another.
  useEffect(() => {
    setResolution('')
    setWithdraw(false)
  }, [plan?.id])

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={onOpenChange}
      title={t('x.answer-this-dispute')}
      description={
        plan
          ? `${plan.employee_name ?? 'This person'} contested the plan raised by ${humanise(
              plan.trigger_kind,
            ).toLowerCase()}. Your answer is shown to them, under your name.`
          : ''
      }
    >
      {plan ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!resolution.trim()) return
            await onSubmit(resolution.trim(), withdraw)
          }}
        >
          <div className="rounded-panel border border-line-subtle bg-surface p-3">
            <p className="label text-fg-subtle">{t('p.what-they-wrote')}</p>
            {/* Verbatim. See the module docstring. */}
            <p className="mt-1 whitespace-pre-wrap text-body text-fg-muted">
              {plan.dispute_note}
            </p>
          </div>

          <div className="mt-4">
            <Textarea
              id={`dispute-answer-${plan.id}`}
              label={t('u.your-answer')}
              hint={t('p.they-read-this-on-their-own')}
              rows={4}
              maxLength={2000}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              required
            />
          </div>

          <div className="mt-3">
            <Checkbox
              label={t('p.withdraw-the-plan')}
              hint={t('p.it-stops-being-assigned-to-them')}
              checked={withdraw}
              onCheckedChange={setWithdraw}
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={withdraw ? 'danger' : 'primary'}
              disabled={!resolution.trim()}
              loading={busy}
            >
              {withdraw ? 'Withdraw and answer' : 'Send the answer'}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  )
}
