/**
 * Training and simulation history for one person — as far as the API allows.
 *
 * There is no per-employee assignment endpoint and no per-employee campaign
 * endpoint: `/api/training/my` and `/api/simulations/{id}` answer for the
 * signed-in employee and for a whole campaign respectively. Reconstructing a
 * roster-wide picture would take one request per campaign per person.
 *
 * So this panel shows what genuinely exists — the training and simulation
 * signals the risk engine recorded against them — and says plainly that it is a
 * derived view of the event trail rather than an assignment list. Inventing the
 * missing list would be the easier screen and a false one.
 */

import { useT } from '../../lib/i18n'
import { GraduationCap, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RiskEvent } from '../../domain/types'
import { cn, formatDateTime, signed, timeAgo } from '../../lib/format'
import { signalFor } from './riskModel'

const TRAINING_SIGNALS = new Set([
  'training_completed',
  'training_comprehension',
  'training_failed',
  'training_ignored',
])

const SIMULATION_SIGNALS = new Set(['simulated_phish_click', 'simulated_phish_report'])

export interface EmployeeActivityProps {
  events: RiskEvent[]
}

function Group({
  icon: Icon,
  title,
  events,
  emptyLine,
}: {
  icon: LucideIcon
  title: string
  events: RiskEvent[]
  emptyLine: string
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-h text-fg">
        <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        {title}
      </h3>

      {events.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">{emptyLine}</p>
      ) : (
        <ul className="mt-3 divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-fg">{signalFor(event.type)?.label ?? event.type}</p>
                <p className="mt-0.5 break-words text-xs text-fg-subtle">{event.reason}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'text-sm tabular-nums',
                    event.delta > 0 ? 'text-critical' : event.delta < 0 ? 'text-safe' : 'text-fg-muted',
                  )}
                >
                  {event.delta === 0 ? '0.0' : signed(event.delta, 1)}
                </p>
                <p className="text-xs text-fg-faint" title={formatDateTime(event.created_at)}>
                  {timeAgo(event.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function EmployeeActivity({ events }: EmployeeActivityProps) {
  const t = useT()
  const training = events.filter((event) => TRAINING_SIGNALS.has(event.type))
  const simulations = events.filter((event) => SIMULATION_SIGNALS.has(event.type))

  return (
    <div className="space-y-6">
      <Group
        icon={GraduationCap}
        title={t('x.training-recorded')}
        events={training}
        emptyLine="No completion, comprehension, failure or expiry has been recorded for this person in the events the API returns."
      />

      <Group
        icon={Target}
        title={t('x.simulation-outcomes')}
        events={simulations}
        emptyLine="No simulated-phishing click or report has been recorded for this person in the events the API returns."
      />

      <p className="border-t border-line-subtle pt-3 text-xs text-fg-subtle">
        This is derived from the risk-event trail, not from an assignment list. The platform exposes
        no per-employee assignment or campaign endpoint, so an outstanding assignment that has not
        yet produced an event does not appear here.
      </p>
    </div>
  )
}
