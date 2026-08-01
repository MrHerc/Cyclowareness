/**
 * What this sample could do, rated — and, when there is nothing to rate, said.
 *
 * The panel leads with the disclaimer the engine stores on the rating itself,
 * because the notation deliberately resembles CVSS and a reader who assumes it
 * IS CVSS will quote it to someone who checks. It is a rating of demonstrated
 * capability, computed from what the analysis actually observed.
 *
 * A base score of 0 at severity "none" is not "low risk". It means nothing was
 * demonstrated, and the rationale says why — so the zero is rendered as a
 * sentence rather than as a number a reader has to interpret.
 */

import type { SandboxImpact } from '../../domain/types'
import { Panel } from '../../components/ui'
import { cn, num } from '../../lib/format'

export interface ImpactPanelProps {
  impact: SandboxImpact | Record<string, never>
}

const SEVERITY_TONE: Record<string, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  none: 'text-fg-muted',
}

export function ImpactPanel({ impact }: ImpactPanelProps) {
  const rated = 'vector' in impact ? (impact as SandboxImpact) : null
  if (!rated) return null

  const nothingDemonstrated = rated.severity === 'none' || rated.base_score === 0

  return (
    <Panel>
      <h2 className="text-h text-fg">Impact</h2>

      {nothingDemonstrated ? (
        <p className="mt-2 text-body text-fg-muted">
          Nothing here is rated, because nothing was demonstrated.{' '}
          {rated.rationale[0]?.why ??
            'No capability was derived from the evidence, so there is no impact to score.'}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className={cn('text-hero', SEVERITY_TONE[rated.severity] ?? 'text-fg')}>
              {num(rated.base_score, 1)}
            </span>
            <span className={cn('text-lead uppercase', SEVERITY_TONE[rated.severity] ?? 'text-fg')}>
              {rated.severity}
            </span>
            <span className="tech break-all text-xs text-fg-faint">{rated.vector}</span>
          </div>

          {rated.capabilities.length > 0 ? (
            <div className="mt-5">
              <p className="label text-fg-subtle">What the evidence shows it can do</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {rated.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="rounded-panel border border-line-subtle px-2.5 py-1 text-xs text-fg-muted"
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {rated.rationale.length > 0 ? (
            <div className="mt-5">
              <p className="label text-fg-subtle">How each metric was set</p>
              <dl className="divide-line mt-1">
                {rated.rationale.map((row, index) => (
                  <div
                    key={`${row.metric}-${index}`}
                    className="grid gap-0.5 py-2 sm:grid-cols-[7rem_1fr] sm:gap-4"
                  >
                    <dt className="tech text-sm text-fg-subtle">
                      {row.metric}
                      {row.value ? `: ${row.value}` : ''}
                    </dt>
                    <dd className="min-w-0 text-sm text-fg-muted">{row.why}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </>
      )}

      {/* Stored on the rating, not written here: the same sentence travels with
          the JSON export and the signed evidence, so a reader who never saw this
          page still gets it. */}
      {rated.disclaimer ? (
        <p className="mt-5 border-t border-line-subtle pt-4 text-xs text-fg-faint">
          {rated.disclaimer}
        </p>
      ) : null}
    </Panel>
  )
}
