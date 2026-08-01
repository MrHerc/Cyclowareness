/**
 * What happened when the sample was actually run — or why it never was.
 *
 * This panel exists as much for the second case as the first. Three states look
 * identical if you only draw the findings:
 *
 *   - no worker is attached, so nothing was ever detonated;
 *   - a worker ran the sample and observed nothing;
 *   - a worker was offered the sample and REFUSED it.
 *
 * The third is a hole in the evidence and the most dangerous to render as a
 * quiet "no findings", because a live sample the sandbox declined then reads as
 * a sample that behaved itself. Each state gets its own sentence.
 *
 * The sample is never run by the web application. Detonation happens on an
 * isolated host that posts its findings back, which is why this data can be
 * absent at all.
 */

import { Radiation } from 'lucide-react'
import type { SandboxDynamicReport, SandboxSignal } from '../../domain/types'
import { Panel } from '../../components/ui'
import { cn, duration, humanise } from '../../lib/format'
import { worstFirst } from './shared'

export interface DynamicPanelProps {
  dynamic: SandboxDynamicReport
  /** From `/api/sandbox/capabilities` — whether a worker is attached at all. */
  workerAttached: boolean
  workerUnavailableReason: string | null
}

const SEVERITY_TONE: Record<string, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  info: 'text-fg-muted',
}

function Timeline({ events }: { events: NonNullable<SandboxDynamicReport['timeline']> }) {
  // One lane per kind, in first-seen order.
  const lanes = events.reduce<Record<string, typeof events>>((acc, event) => {
    ;(acc[event.kind] ??= []).push(event)
    return acc
  }, {})
  const span = Math.max(...events.map((e) => e.t_ms), 1)

  return (
    <div className="mt-4">
      <p className="label text-fg-subtle">Behaviour over time</p>
      <div className="mt-2 space-y-2">
        {Object.entries(lanes).map(([kind, lane]) => (
          <div key={kind} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-3">
            <span className="truncate text-xs text-fg-muted" title={kind}>
              {humanise(kind)}
            </span>
            <div className="relative h-5 rounded-panel border border-line-subtle bg-surface">
              {lane.map((event, index) => (
                <span
                  key={`${event.t_ms}-${index}`}
                  className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand"
                  style={{ left: `calc(${(event.t_ms / span) * 100}% - 3px)` }}
                  title={`${event.t_ms} ms — ${event.detail || kind}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-fg-faint">
        {events.length} events over {duration(span)}. Hover a point for its detail.
      </p>
    </div>
  )
}

export function DynamicPanel({
  dynamic,
  workerAttached,
  workerUnavailableReason,
}: DynamicPanelProps) {
  const signals = worstFirst((dynamic.signals ?? []) as (SandboxSignal & { severity: string })[])
  const ran = dynamic.ran === true
  const refused = dynamic.refused === true

  return (
    <Panel tone={refused ? 'danger' : 'default'}>
      <div className="flex items-start gap-3">
        <Radiation
          className={cn('mt-0.5 size-5 shrink-0', refused ? 'text-critical' : 'text-fg-subtle')}
          aria-hidden="true"
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-h text-fg">Behavioural analysis</h2>

          {refused ? (
            <p className="mt-1 text-body text-fg-muted">
              The detonation sandbox was offered this sample and declined to run it.{' '}
              {dynamic.unavailable_reason ?? 'No reason was given.'} This is a gap in the evidence,
              not a clean result: nothing observed it, so nothing can vouch for it.
            </p>
          ) : ran ? (
            <p className="mt-1 text-body text-fg-muted">
              Detonated on the {dynamic.engine ?? 'attached'} engine
              {dynamic.duration_ms ? <> for {duration(dynamic.duration_ms)}</> : null}.{' '}
              {signals.length === 0
                ? 'The run completed and produced no behavioural findings — the sample did nothing the worker recognised.'
                : signals.length === 1
                  ? 'One behavioural finding was observed, and scored alongside the static evidence.'
                  : `${signals.length} behavioural findings were observed, and scored alongside the static evidence.`}
            </p>
          ) : workerAttached ? (
            <p className="mt-1 text-body text-fg-muted">
              A detonation worker is attached but has not reported on this sample yet.{' '}
              {dynamic.unavailable_reason ?? 'It may still be queued.'} Everything below the verdict
              comes from static analysis alone.
            </p>
          ) : (
            <p className="mt-1 text-body text-fg-muted">
              This sample was not run. Detonation requires an isolated worker, and this deployment
              has none attached
              {workerUnavailableReason ? <> — {workerUnavailableReason}</> : null}. The verdict is
              from static analysis alone, which reads every byte but never executes them.
            </p>
          )}

          {signals.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {signals.map((signal) => (
                <li key={signal.id} className="rounded-panel border border-line-subtle p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-body text-fg">{signal.title}</span>
                    <span
                      className={cn(
                        'shrink-0 text-xs uppercase',
                        SEVERITY_TONE[signal.severity] ?? 'text-fg-muted',
                      )}
                    >
                      {signal.severity}
                    </span>
                  </div>
                  {signal.detail ? (
                    <p className="mt-1 text-sm text-fg-muted">{signal.detail}</p>
                  ) : null}
                  <p className="tech mt-1 text-xs text-fg-faint">{signal.id}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {dynamic.timeline && dynamic.timeline.length > 0 ? (
            <Timeline events={dynamic.timeline} />
          ) : null}
        </div>
      </div>
    </Panel>
  )
}
