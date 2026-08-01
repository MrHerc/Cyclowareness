/**
 * What to do next — generated, and labelled as generated.
 *
 * These sentences come from a fixed rule set over the figures on this page. No
 * model wrote them, so the panel carries the `template` provenance badge rather
 * than the machine hue, and every item prints the number that triggered it. A
 * recommendation a reader cannot trace back to a figure is an assertion wearing
 * a dashboard's authority.
 */

import { CheckCircle2 } from 'lucide-react'
import { AIProvenanceBadge } from '../../components/data'
import { Panel } from '../../components/ui'
import type { Recommendation } from './derive'

export interface RecommendationListProps {
  items: Recommendation[]
}

export function RecommendationList({ items }: RecommendationListProps) {
  return (
    <Panel
      title="Recommended next steps"
      subtitle="Derived from the figures on this page by a fixed rule set. Each one names the measurement it came from."
      actions={<AIProvenanceBadge provenance="template" generationSource="mock" />}
    >
      {items.length > 0 ? (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-3">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-chip border border-line text-xs text-fg-subtle tabular-nums"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-body text-fg">{item.headline}</p>
                <p className="mt-1 text-sm text-fg-subtle">{item.evidence}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-safe" aria-hidden="true" />
          <div>
            <p className="text-body text-fg">No rule on this page fired.</p>
            <p className="mt-1 text-sm text-fg-subtle">
              Click rate is at or below reporting rate, no department sits in the high band, no
              high-severity finding is open, and at least one loop has closed with a measurement.
              That is the absence of a warning, not a certificate.
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}
