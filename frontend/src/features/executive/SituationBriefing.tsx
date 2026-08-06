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
 *
 * `briefingAdjustments` is the third disclosure and the newest. On the live
 * deployment the model opened with a draft it then abandoned — asserting click
 * rates had "roughly halved" when they had risen 47% — and both the wrong draft
 * and its own correction were shown to the board. The server now removes the
 * abandoned half and REPORTS that it did. Repairing the output and presenting
 * it as clean would be the product deciding what the reader may know about its
 * own model, which is the same failure as mislabelling who wrote it.
 */

import { useT } from '../../lib/i18n'
import { provenanceOf } from '../../domain/types'
import type { Metrics } from '../../domain/types'
import { AIProvenanceBadge } from '../../components/data'
import { Panel } from '../../components/ui'

export interface SituationBriefingProps {
  briefing: string | undefined
  /** The backend's raw value: 'anthropic' | 'mock'. Never inferred. */
  briefingSource: string | undefined
  /** What the server's guard removed before this paragraph was shown. */
  briefingAdjustments?: { rule: string; why: string; removed: string }[]
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
  briefingAdjustments,
  metrics,
  modelConnected,
}: SituationBriefingProps) {
  const t = useT()
  const provenance = provenanceOf(briefingSource)
  const text = briefing?.trim() ?? ''
  const measured = hasSomethingToSay(metrics)

  return (
    <Panel
      title={t('x.where-the-organisation-stands')}
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
        <>
          <p className="max-w-4xl text-lead text-fg-muted">{text}</p>
          {briefingAdjustments && briefingAdjustments.length > 0 ? (
            <p className="mt-3 max-w-4xl border-t border-line-subtle pt-3 text-sm text-fg-subtle">
              {briefingAdjustments.map((a) => a.why).join(' ')}
            </p>
          ) : null}
        </>
      ) : (
        <div className="max-w-3xl space-y-2">
          <p className="text-lead text-fg-muted">{t('p.there-is-not-enough-measured-activity')}</p>
          <p className="text-sm text-fg-subtle">
            {metrics
              ? `No rate in the trailing ${metrics.window_days} days reached the ${metrics.min_sample} resolved events the platform requires before it will report one. A simulation, an assigned module completed, or a threat carried through the loop will each produce something to say here.`
              : t('p.the-dashboard-has-not-answered-yet')}
          </p>
        </div>
      )}
    </Panel>
  )
}
