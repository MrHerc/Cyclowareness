/**
 * The learner's own remediation plans, in their own words.
 *
 * The disclosure is rendered VERBATIM from the server, not from a template
 * here. What a person was told about why something was assigned, who can see
 * it, and how to dispute it has to stay recoverable after the wording changes —
 * so it is stored on the plan and read back, never regenerated.
 *
 * Only approved and delivered plans reach this list; the server withholds the
 * rest. Showing someone a plan a human has not yet cleared, or one the output
 * firewall refused, would be alarming and untrue.
 */

import { ClipboardCheck } from 'lucide-react'
import type { RemediationPlan } from '../../domain/types'
import { Panel } from '../../components/ui'
import { formatDate, humanise } from '../../lib/format'

export interface MyRemediationPlansProps {
  plans: RemediationPlan[]
}

export function MyRemediationPlans({ plans }: MyRemediationPlansProps) {
  if (plans.length === 0) return null

  return (
    <Panel
      title="Assigned to you after an event"
      subtitle="Each of these was triggered by something specific, which is named."
    >
      <ul className="space-y-3">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-panel border border-line bg-elevated p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-h text-fg">
                {plan.framing.headline ?? 'Something was assigned to you'}
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
                <span className="label text-fg-subtle">What to do</span>
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
          </li>
        ))}
      </ul>
    </Panel>
  )
}
