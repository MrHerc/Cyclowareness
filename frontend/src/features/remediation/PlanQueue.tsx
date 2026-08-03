/**
 * The plan queue, and the human gate on it.
 *
 * Three things this table refuses to blur.
 *
 * A plan built by a tag match against the library is labelled as one — "matched
 * from your library", never AI. `ai_ran` is the server's own field and the badge
 * reads it directly, so a template can never acquire a model's provenance by
 * sitting next to one.
 *
 * A BLOCKED plan shows its rejection code and cannot be approved. The firewall's
 * answer is final: an approve button that overrides it is the same as not having
 * a firewall, and the server answers 409 if one is ever wired.
 *
 * A plan that reached nobody says why, in the words the server wrote.
 *
 * And a DISPUTED plan is surfaced as a queue of its own. Someone contested a
 * decision a machine made about them and is waiting on a human; if that state
 * were only a column in the database, the appeal route would exist on paper and
 * nowhere else. The analyst can answer it, and can withdraw the plan — an appeal
 * whose only possible answer is "upheld" is theatre.
 */

import { useState } from 'react'
import { Check, MessageSquareWarning, ShieldX, X } from 'lucide-react'
import { disputeState, provenanceOf, type RemediationPlan } from '../../domain/types'
import { AIProvenanceBadge } from '../../components/data'
import { ConfirmationDialog } from '../../components/states'
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '../../components/ui'
import { formatDateTime, humanise } from '../../lib/format'
import { useRemediationDecision, useRemediationDisputeResolution } from '../../lib/api/mutations'
import { DisputeResolutionDialog } from './DisputeResolutionDialog'

export interface PlanQueueProps {
  plans: RemediationPlan[]
}

const URGENCY_TONE: Record<string, string> = {
  immediate: 'text-critical',
  prompt: 'text-high',
  routine: 'text-fg-muted',
}

export function PlanQueue({ plans }: PlanQueueProps) {
  const toast = useToast()
  const [pending, setPending] = useState<{
    plan: RemediationPlan
    decision: 'approve' | 'reject'
  } | null>(null)
  const [answering, setAnswering] = useState<RemediationPlan | null>(null)

  const resolve = useRemediationDisputeResolution({
    onSuccess: (_data, vars) =>
      toast.show({
        title: vars.withdraw ? 'Plan withdrawn' : 'Dispute answered',
        description: vars.withdraw
          ? 'It is no longer assigned, and they are told why.'
          : 'They can read your answer on their own screen.',
        tone: 'success',
      }),
    onError: (error) =>
      toast.show({ title: 'The answer did not save', description: error.message, tone: 'error' }),
  })

  const decide = useRemediationDecision({
    onSuccess: (_data, vars) =>
      toast.show({
        title: vars.decision === 'approve' ? 'Plan approved' : 'Plan rejected',
        description:
          vars.decision === 'approve'
            ? 'It is now cleared to reach the person it names.'
            : 'Nothing was delivered.',
        tone: 'success',
      }),
    onError: (error) =>
      toast.show({ title: 'The decision did not save', description: error.message, tone: 'error' }),
  })

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person and trigger</TableHead>
            <TableHead>What was attached</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead numeric>Raised</TableHead>
            <TableHead>Decision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const blocked = plan.status === 'blocked'
            const dispute = disputeState(plan)
            return (
              <TableRow key={plan.id}>
                <TableCell className="max-w-[18rem]">
                  <span className="block truncate text-fg">
                    {plan.employee_name ?? `Employee ${plan.employee_id}`}
                  </span>
                  <p className="truncate text-xs text-fg-faint">
                    {humanise(plan.trigger_kind)}
                    {plan.trigger_ref ? ` · ${plan.trigger_ref}` : ''}
                  </p>
                </TableCell>

                <TableCell className="max-w-[20rem]">
                  {blocked ? (
                    <span className="inline-flex items-center gap-1.5 text-critical">
                      <ShieldX className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
                      Nothing — refused by the firewall
                    </span>
                  ) : (
                    <>
                      <span className="block truncate text-fg-muted">
                        {plan.framing.headline ?? 'No framing recorded'}
                      </span>
                      <span className="mt-1 inline-block">
                        {/* THE BADGE ONLY APPEARS WHEN A MODEL WAS ACTUALLY
                            INVOLVED. `ai_ran` false means retrieval alone chose
                            this, and none of the provenance vocabulary fits a
                            catalogue tag match — `provenanceOf('')` returns
                            `analyst_edited`, which no analyst did. The product's
                            own rule is to say "matched from your library", so
                            that is what it says. */}
                        {plan.ai_ran ? (
                          <AIProvenanceBadge
                            provenance={provenanceOf('anthropic', {
                              approved: plan.status === 'approved' || plan.status === 'delivered',
                            })}
                            generationSource="anthropic"
                          />
                        ) : (
                          <span className="rounded-chip border border-line-subtle px-2 py-0.5 text-xs text-fg-subtle">
                            Matched from your library
                          </span>
                        )}
                      </span>
                    </>
                  )}
                  {plan.not_attached_reason ? (
                    <p className="mt-1 text-xs text-fg-faint">{plan.not_attached_reason}</p>
                  ) : null}
                </TableCell>

                <TableCell>
                  <span className={URGENCY_TONE[plan.urgency] ?? 'text-fg-muted'}>
                    {humanise(plan.urgency)}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge status={plan.status} size="sm" dot />
                  {plan.rejection_code ? (
                    <p className="tech mt-1 truncate text-xs text-fg-faint">
                      {plan.rejection_code}
                    </p>
                  ) : null}
                  {dispute === 'open' ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-high">
                      <MessageSquareWarning
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                        strokeWidth={1.75}
                      />
                      Disputed
                    </p>
                  ) : dispute === 'resolved' ? (
                    <p className="mt-1 text-xs text-fg-faint">Dispute answered</p>
                  ) : null}
                </TableCell>

                <TableCell numeric>
                  <span className="text-fg-muted">{formatDateTime(plan.created_at)}</span>
                </TableCell>

                <TableCell>
                  {/* An open dispute is the work. A person is waiting on a
                      human, and that outranks approving the next plan. */}
                  {dispute === 'open' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<MessageSquareWarning className="size-4" aria-hidden="true" />}
                      onClick={() => setAnswering(plan)}
                    >
                      Answer the dispute
                    </Button>
                  ) : plan.status === 'proposed' ? (
                    <span className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Check className="size-4" aria-hidden="true" />}
                        onClick={() => setPending({ plan, decision: 'approve' })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<X className="size-4" aria-hidden="true" />}
                        onClick={() => setPending({ plan, decision: 'reject' })}
                      >
                        Reject
                      </Button>
                    </span>
                  ) : blocked ? (
                    <span className="text-xs text-fg-faint">
                      Cannot be approved. Regenerate it instead.
                    </span>
                  ) : (
                    <span className="text-xs text-fg-subtle">
                      {plan.approved_by ? `${humanise(plan.status)} by ${plan.approved_by}` : '—'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <ConfirmationDialog
        open={pending !== null}
        onOpenChange={(next) => (next ? null : setPending(null))}
        title={pending?.decision === 'approve' ? 'Approve this plan' : 'Reject this plan'}
        description={
          pending
            ? pending.decision === 'approve'
              ? `"${pending.plan.framing.headline ?? 'This plan'}" is cleared to reach ${
                  pending.plan.employee_name ?? 'the person it names'
                }. They are told what triggered it and who can see it. This is written to the audit trail under your name.`
              : `Nothing is delivered to ${
                  pending.plan.employee_name ?? 'the person it names'
                }. This is written to the audit trail under your name.`
            : ''
        }
        confirmLabel={pending?.decision === 'approve' ? 'Approve' : 'Reject'}
        tone={pending?.decision === 'approve' ? 'default' : 'danger'}
        busy={decide.isPending}
        onConfirm={async () => {
          if (!pending) return
          await decide.mutateAsync({ id: pending.plan.id, decision: pending.decision })
          setPending(null)
        }}
      />

      <DisputeResolutionDialog
        plan={answering}
        busy={resolve.isPending}
        onOpenChange={(next) => (next ? null : setAnswering(null))}
        onSubmit={async (resolution, withdraw) => {
          if (!answering) return
          await resolve.mutateAsync({ id: answering.id, resolution, withdraw })
          setAnswering(null)
        }}
      />
    </>
  )
}
