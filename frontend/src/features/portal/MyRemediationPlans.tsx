/**
 * The learner's own remediation plans, in their own words — and the appeal.
 *
 * The disclosure is rendered VERBATIM from the server, not from a template
 * here. What a person was told about why something was assigned, who can see
 * it, and how to dispute it has to stay recoverable after the wording changes —
 * so it is stored on the plan and read back, never regenerated.
 *
 * THE DISPUTE CONTROL IS NOT DECORATION. The stored disclosure ends "if you
 * think this was assigned in error, use Dispute — that goes to a person, not to
 * a system." For a while it said that with nothing behind it. A product that
 * tells someone they may contest an automated decision about them, and then
 * gives them no way to, has told them something worse than nothing — so the
 * button is here, next to the sentence that promises it, and it reaches a named
 * human rather than changing anything by itself.
 *
 * Only approved and delivered plans reach this list, plus any the person has
 * disputed. The last part matters: a withdrawn plan stays visible with the
 * outcome on it, because winning an appeal must not look identical to the row
 * quietly disappearing.
 */

import { useT } from '../../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, MessageSquareWarning } from 'lucide-react'
import { disputeState, type RemediationPlan } from '../../domain/types'
import { Button, Panel, Textarea, useToast } from '../../components/ui'
import { formatDate, humanise } from '../../lib/format'
import { useRemediationDispute } from '../../lib/api/mutations'

export interface MyRemediationPlansProps {
  plans: RemediationPlan[]
}

function DisputeForm({ plan, onDone }: { plan: RemediationPlan; onDone: () => void }) {
  const t = useT()
  const toast = useToast()
  const [note, setNote] = useState('')
  const dispute = useRemediationDispute({
    onSuccess: () => {
      toast.show({
        title: t('u.sent-to-a-person-2'),
        description: t('p.someone-will-read-what-you-wrote'),
        tone: 'success',
      })
      onDone()
    },
    onError: (error) =>
      toast.show({ title: t('u.that-did-not-send-2'), description: error.message, tone: 'error' }),
  })

  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!note.trim()) return
        dispute.mutate({ id: plan.id, note: note.trim() })
      }}
    >
      <Textarea
        // The trigger that opened this form unmounted when it did, so without
        // this focus lands on <body> and a keyboard user has to tab back in
        // from the top of the page to lodge an appeal.
        autoFocus
        id={`dispute-${plan.id}`}
        label={t('p.why-do-you-think-this-was')}
        hint={t('p.this-is-sent-to-a-person')}
        rows={3}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        required
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={!note.trim()}
          loading={dispute.isPending}
        >
          {t('u.send-to-a-person')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Dispute({ plan }: { plan: RemediationPlan }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // Cancelling, or a successful send, unmounts the form. Put focus back on
  // the control that opened it rather than dropping it to <body>.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus()
    wasOpen.current = open
  }, [open])
  const state = disputeState(plan)

  if (state === 'open') {
    return (
      <p className="mt-3 rounded-panel border border-line-subtle bg-surface p-3 text-xs text-fg-subtle">
        <span className="text-fg-muted">{t('u.you-disputed-this')}</span> Nobody has answered yet. What you
        wrote: &ldquo;{plan.dispute_note}&rdquo;
      </p>
    )
  }

  if (state === 'resolved') {
    return (
      <div className="mt-3 rounded-panel border border-line-subtle bg-surface p-3 text-xs">
        <p className="text-fg-subtle">
          <span className="text-fg-muted">{t('u.you-disputed-this-and-a-person-answered')}</span>{' '}
          {plan.dispute_resolution}
        </p>
        {/* The status is the server's, not a client guess: `rejected` after a
            dispute is the analyst having withdrawn it. */}
        {plan.status === 'rejected' ? (
          <p className="mt-1 text-fg-muted">{t('p.this-is-no-longer-assigned-to')}</p>
        ) : null}
      </div>
    )
  }

  if (open) return <DisputeForm plan={plan} onDone={() => setOpen(false)} />

  return (
    <Button
      ref={triggerRef}
      className="mt-3"
      size="sm"
      variant="outline"
      icon={<MessageSquareWarning className="size-4" aria-hidden="true" />}
      onClick={() => setOpen(true)}
    >
      Dispute
    </Button>
  )
}

export function MyRemediationPlans({ plans }: MyRemediationPlansProps) {
  const t = useT()
  if (plans.length === 0) return null

  return (
    <Panel
      title={t('x.assigned-to-you-after-an')}
      subtitle={t('x.each-of-these-was-triggered')}
    >
      <ul className="space-y-3">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-panel border border-line bg-elevated p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-h text-fg">
                {plan.framing.headline ?? t('p.something-was-assigned-to-you')}
              </h3>
              <span className="shrink-0 text-xs text-fg-faint">
                {formatDate(plan.created_at)}
              </span>
            </div>

            <p className="mt-1 text-xs text-fg-subtle">
              Triggered by {humanise(plan.trigger_kind).toLowerCase()}
            </p>

            {plan.framing.why_you ? (
              <p className="mt-2 text-body text-fg-muted">{plan.framing.why_you}</p>
            ) : null}

            {plan.framing.what_to_do && plan.framing.what_to_do.length > 0 ? (
              <div className="mt-3">
                <span className="label text-fg-subtle">{t('u.what-to-do')}</span>
                <ul className="mt-1 space-y-1">
                  {plan.framing.what_to_do.map((step) => (
                    <li key={step} className="flex items-start gap-2 text-body text-fg">
                      <ClipboardCheck
                        className="mt-1 size-4 shrink-0 text-fg-subtle"
                        aria-hidden="true"
                        strokeWidth={1.75}
                      />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {plan.framing.takeaway ? (
              <p className="mt-3 text-body text-fg-muted">{plan.framing.takeaway}</p>
            ) : null}

            {/* Verbatim from the server. See the module docstring. */}
            {plan.learner_disclosure ? (
              <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-fg-subtle">
                {plan.learner_disclosure}
              </p>
            ) : null}

            <Dispute plan={plan} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
