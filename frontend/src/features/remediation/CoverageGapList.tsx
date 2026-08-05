/**
 * What the library could not answer.
 *
 * Presented as a roadmap, not an error list. Each row is a behaviour the engine
 * met and had nothing tagged for, so nothing was attached — which is the honest
 * result, and the brief for the next piece of content. Ranked by how often each
 * was needed, because that is the order they are worth writing in.
 */

import { useT } from '../../lib/i18n'
import { LibraryBig } from 'lucide-react'
import type { RemediationCoverageGap } from '../../domain/types'
import { EmptyState } from '../../components/states'
import { Panel } from '../../components/ui'
import { formatDate, humanise, num } from '../../lib/format'

export interface CoverageGapListProps {
  data: {
    items: RemediationCoverageGap[]
    total: number
    covered_behaviours: string[]
    note: string
  }
}

export function CoverageGapList({ data }: CoverageGapListProps) {
  const t = useT()
  return (
    <Panel title={t('x.coverage-gaps')} subtitle={data.note}>
      {data.items.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          compact
          headline="Nothing has gone unanswered yet"
          description={`Every behaviour the engine has met so far is covered by the library. It currently answers: ${data.covered_behaviours.map(humanise).join(', ')}.`}
        />
      ) : (
        <>
          <ul className="space-y-2">
            {data.items.map((gap) => (
              <li key={gap.id} className="rounded-panel border border-line-subtle p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-body text-fg">{humanise(gap.behaviour)}</span>
                  <span className="text-sm text-fg-muted">
                    needed {num(gap.times_hit, 0)} {gap.times_hit === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-fg-muted">{gap.detail}</p>
                <p className="mt-1 text-xs text-fg-faint">
                  From {humanise(gap.trigger_kind)} · first seen {formatDate(gap.first_seen_at)},
                  last {formatDate(gap.last_seen_at)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-fg-faint">
            The library currently answers: {data.covered_behaviours.map(humanise).join(', ')}.
          </p>
        </>
      )}
    </Panel>
  )
}
