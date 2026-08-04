/**
 * The score, and every reason it is what it is.
 *
 * A number attached to a person's name, shown to that person, with no working
 * out, is the single most hostile thing a product like this can do. So the
 * order here is deliberate: the sentence first, the factors second, the events
 * third, and the number itself is never on screen without the sample it rests
 * on. Nothing on this panel is computed for display — the factors and the events
 * are the engine's own audit trail.
 */

import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { HonestMetric, type MetricTone } from '../../components/data'
import { Panel } from '../../components/ui'
import type { RiskFactor } from '../../domain/types'
import { cn, formatDateTime, num, signed, timeAgo } from '../../lib/format'
import { recommendedAction, riskSentence, type RiskEvidence } from './riskNarrative'

export interface RiskScorePanelProps {
  evidence: RiskEvidence
  openAssignments: number
  openIncidentWork: number
}

const BAND_TONE: Record<RiskEvidence['band'], MetricTone> = {
  low: 'safe',
  elevated: 'medium',
  high: 'critical',
}

function FactorRow({ factor, direction }: { factor: RiskFactor; direction: 'up' | 'down' }) {
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="flex min-w-0 items-baseline gap-2">
        <Icon
          className={cn('size-3.5 shrink-0', direction === 'up' ? 'text-critical' : 'text-safe')}
          aria-hidden="true"
        />
        <span className="truncate text-body text-fg-muted">{factor.label}</span>
        <span className="shrink-0 text-xs text-fg-faint">
          {factor.events} {factor.events === 1 ? 'event' : 'events'}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-body tabular-nums',
          direction === 'up' ? 'text-critical' : 'text-safe',
        )}
      >
        {signed(factor.contribution, 1)}
      </span>
    </li>
  )
}

function FactorColumn({
  heading,
  factors,
  direction,
  emptyCopy,
}: {
  heading: string
  factors: RiskFactor[]
  direction: 'up' | 'down'
  emptyCopy: string
}) {
  return (
    <div className="min-w-0">
      <h3 className="label text-fg-subtle">{heading}</h3>
      {factors.length === 0 ? (
        <p className="mt-2 text-sm text-fg-faint">{emptyCopy}</p>
      ) : (
        <ul className="mt-1 divide-line">
          {factors.map((factor) => (
            <FactorRow key={factor.factor} factor={factor} direction={direction} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function RiskScorePanel({
  evidence,
  openAssignments,
  openIncidentWork,
}: RiskScorePanelProps) {
  const sentence = riskSentence(evidence)

  return (
    <Panel
      title="Your risk score"
      subtitle="Between 0 and 100. Lower is safer. Every movement below was recorded by the risk engine when it happened."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <HonestMetric
            label={`Current score — ${evidence.bandLabel}`}
            value={evidence.current}
            format="score"
            digits={1}
            tone={BAND_TONE[evidence.band]}
            sample={evidence.scoredEvents}
            sampleNoun="recorded risk events"
            source="live"
            sourceDetail="risk engine"
            lastUpdated={evidence.lastRecalculated}
            comparison={{
              previous: evidence.previous,
              valid: evidence.previous !== null,
              reason: 'nothing has moved your score yet',
              label: 'since your last recorded change',
              improvement: 'down',
            }}
          />
        </div>

        {sentence ? (
          <p className="text-lead text-fg-muted">{sentence}</p>
        ) : (
          <p className="text-lead text-fg-muted">
            Nothing has moved your score yet. It is still the starting point set by how sensitive
            your role is.
          </p>
        )}

        {/* WHERE THE SCORE STARTED, kept out of the two columns below.
            Those are headed "What is raising it" / "What is lowering it" and
            describe BEHAVIOUR — their own empty state says so. A role-sensitivity
            baseline and a figure carried over from before the platform are
            neither, and showing them there told a named person that a starting
            position was something they had done. They are still shown, because
            removing them from the columns without displaying them anywhere would
            leave the total unexplained. */}
        {evidence.startingPoints.length > 0 ? (
          <div className="border-t border-line-subtle pt-5">
            <h3 className="label text-fg-subtle">Where your score started</h3>
            <p className="mt-1 text-sm text-fg-faint">
              Set before anything you did, and not a judgement about you.
            </p>
            <ul className="mt-2">
              {evidence.startingPoints.map((factor) => (
                <li
                  key={factor.factor}
                  className="flex items-baseline justify-between gap-3 py-1.5"
                >
                  <span className="truncate text-body text-fg-muted">{factor.label}</span>
                  <span className="shrink-0 text-body tabular-nums text-fg">
                    {factor.contribution > 0 ? '+' : ''}
                    {num(factor.contribution, 1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-6 border-t border-line-subtle pt-5 sm:grid-cols-2">
          <FactorColumn
            heading="What is raising it"
            factors={evidence.increasing}
            direction="up"
            emptyCopy="Nothing. No behaviour has pushed your score up."
          />
          <FactorColumn
            heading="What is lowering it"
            factors={evidence.reducing}
            direction="down"
            emptyCopy="Nothing yet. Completing training and reporting suspicious messages both lower it."
          />
        </div>

        <div className="border-t border-line-subtle pt-5">
          <h3 className="label text-fg-subtle">Recent changes</h3>
          {evidence.events.length === 0 ? (
            <p className="mt-2 text-sm text-fg-faint">
              No individual events have been recorded against you.
            </p>
          ) : (
            <ul className="mt-2 divide-line">
              {evidence.events.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="min-w-0">
                    <span className="text-body text-fg-muted">{event.reason}</span>
                    <span className="ml-2 text-xs text-fg-faint">{timeAgo(event.created_at)}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-body tabular-nums',
                      event.delta > 0
                        ? 'text-critical'
                        : event.delta < 0
                          ? 'text-safe'
                          : 'text-fg-subtle',
                    )}
                  >
                    {event.delta === 0 ? 'no change' : signed(event.delta, 1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-control border border-brand/25 bg-brand/5 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="label text-fg-subtle">What to do next</p>
            <p className="mt-1 text-body text-fg">
              {recommendedAction(evidence, openAssignments, openIncidentWork)}
            </p>
          </div>
        </div>

        <p className="text-xs text-fg-faint">
          {evidence.lastRecalculated
            ? `Last recalculated ${formatDateTime(evidence.lastRecalculated)}, from ${num(evidence.scoredEvents, 0)} recorded events.`
            : 'This score has never been recalculated — no events have been recorded against you.'}
        </p>
      </div>
    </Panel>
  )
}
