/**
 * Why the score is what it is, in three sentences.
 *
 * These come from `score_breakdown.top_reasons`, which is the same list the PDF
 * export leads with — there is exactly one answer to "why", and it does not
 * change depending on where it is read.
 *
 * An empty list is not "clean". It means no signal fired, which is a different
 * claim, and the copy says so rather than congratulating the sample.
 */

import { useT } from '../../lib/i18n'
import type { ScoreBreakdown } from '../../domain/types'
import { Badge, Panel } from '../../components/ui'

export interface TopReasonsProps {
  reasons: ScoreBreakdown['top_reasons']
}

export function TopReasons({ reasons }: TopReasonsProps) {
  const t = useT()
  const items = reasons ?? []

  return (
    <Panel
      title={t('x.why-this-scored-the-way')}
      subtitle={t('x.the-highestseverity-observations-in-the')}
    >
      {items.length === 0 ? (
        <p className="text-body text-fg-muted">
          No signal fired on this sample. That is not a clean bill of health — it means the
          analyzers that ran found nothing they recognise, and anything they could not run is listed
          above.
        </p>
      ) : (
        <ol className="divide-line">
          {items.map((reason, index) => (
            <li key={`${reason.id}-${index}`} className="flex gap-4 py-3 first:pt-0 last:pb-0">
              <span className="label mt-1 w-4 shrink-0 text-fg-faint" aria-hidden="true">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-h text-fg">{reason.title}</h3>
                  <Badge status={reason.severity} size="sm" />
                </div>
                {reason.detail ? (
                  <p className="mt-1 text-body text-fg-muted">{reason.detail}</p>
                ) : null}
                <p className="tech mt-1 text-fg-faint">{reason.id}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
