/**
 * The opening paragraph, and an honest label on who wrote it.
 *
 * `briefing_source` is the whole point of this component. When no model is
 * configured the server falls back to a fixed offline generator, and heading
 * that paragraph "AI briefing" in front of a board is the single claim that
 * would cost this product its credibility fastest. `provenanceOf` maps `mock`
 * to `template`, and `AIProvenanceBadge` refuses the machine hue for it.
 *
 * When the metrics behind the paragraph are unmeasured, the paragraph is not
 * shown at all — a generated sentence about a period nobody measured is a
 * confident summary of nothing.
 */

import { provenanceOf } from '../../domain/types'
import type { Metrics } from '../../domain/types'
import { AIProvenanceBadge } from '../../components/data'
import { Panel } from '../../components/ui'

export interface SituationBriefingProps {
  briefing: string | undefined
  /** The backend's raw value: 'anthropic' | 'mock'. Never inferred. */
  briefingSource: string | undefined
  metrics: Metrics | undefined
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined before it answers. */
  modelConnected?: boolean
}

/** Nothing in the trailing window was resolved, so there is nothing to summarise. */
function hasSomethingToSay(metrics: Metrics | undefined): boolean {
  if (!metrics) return false
  return (
    metrics.phishing_click_rate !== null ||
    metrics.report_rate !== null ||
    metrics.training_completion_rate !== null ||
    metrics.avg_risk_score !== null
  )
}

export function SituationBriefing({
  briefing,
  briefingSource,
  metrics,
  modelConnected,
}: SituationBriefingProps) {
  const provenance = provenanceOf(briefingSource)
  const text = briefing?.trim() ?? ''
  const measured = hasSomethingToSay(metrics)

  return (
    <Panel
      title="Where the organisation stands"
      actions={
        text ? (
          <AIProvenanceBadge
            provenance={provenance}
            generationSource={briefingSource}
            modelConnected={modelConnected}
          />
        ) : null
      }
    >
      {text && measured ? (
        <p className="max-w-4xl text-lead text-fg-muted">{text}</p>
      ) : (
        <div className="max-w-3xl space-y-2">
          <p className="text-lead text-fg-muted">
            There is not enough measured activity to summarise this period.
          </p>
          <p className="text-sm text-fg-subtle">
            {metrics
              ? `No rate in the trailing ${metrics.window_days} days reached the ${metrics.min_sample} resolved events the platform requires before it will report one. A simulation, an assigned module completed, or a threat carried through the loop will each produce something to say here.`
              : 'The dashboard has not answered yet, so nothing can be summarised.'}
          </p>
        </div>
      )}
    </Panel>
  )
}
