/**
 * Every observation, worst first.
 *
 * A signal is the only thing in this engine that can move a score, so this list
 * is the complete evidence base for the number at the top of the page — not a
 * selection of the interesting ones. Each row carries the analyzer that raised
 * it and the stable machine id, because a finding an analyst cannot trace back
 * to a rule is an assertion.
 */

import type { RankedSignal } from './shared'
import { EvidenceList } from '../../components/data'
import { Badge, Panel } from '../../components/ui'
import { analyzerLabel, evidenceItems, severityCounts } from './shared'

export interface SignalListProps {
  signals: RankedSignal[]
}

const SEVERITY_DISPLAY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const

export function SignalList({ signals }: SignalListProps) {
  const counts = severityCounts(signals)

  return (
    <Panel
      title="Signals"
      subtitle={`${signals.length} ${signals.length === 1 ? 'observation' : 'observations'} across every analyzer that ran, highest severity first.`}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {SEVERITY_DISPLAY_ORDER.filter((severity) => counts[severity]).map((severity) => (
            <Badge key={severity} status={severity} size="sm">
              {`${counts[severity]} ${severity}`}
            </Badge>
          ))}
        </div>
      }
    >
      {signals.length === 0 ? (
        <p className="text-body text-fg-muted">
          No analyzer raised a signal on this sample. Read that alongside the tier statement above:
          it means nothing recognised fired, not that the sample was proven safe.
        </p>
      ) : (
        <ul className="divide-line">
          {signals.map((signal, index) => {
            const evidence = evidenceItems(signal.evidence)
            return (
              <li key={`${signal.id}-${index}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={signal.severity} size="sm" />
                  <h3 className="text-h text-fg">{signal.title}</h3>
                  <span className="text-xs text-fg-subtle">
                    {analyzerLabel(signal.analyzer)}
                  </span>
                </div>

                {signal.detail ? (
                  <p className="mt-1 text-body text-fg-muted">{signal.detail}</p>
                ) : null}

                <p className="tech mt-1 text-fg-faint">{signal.id}</p>

                {evidence.length > 0 ? (
                  <EvidenceList items={evidence} mono className="mt-1" />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
