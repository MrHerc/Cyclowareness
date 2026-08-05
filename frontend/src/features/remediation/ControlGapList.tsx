/**
 * Where the person is not the vulnerability.
 *
 * MFA push-bombing is answered by number matching, not by a module. An engine
 * that can only produce training will produce training — for everything, for
 * ever — so each row here is a case where it deliberately did not, and named
 * the control that would actually remove the exposure.
 */

import { useT } from '../../lib/i18n'
import { Wrench } from 'lucide-react'
import type { RemediationControlGap } from '../../domain/types'
import { EmptyState } from '../../components/states'
import { Badge, Panel } from '../../components/ui'
import { formatDate, humanise } from '../../lib/format'

export interface ControlGapListProps {
  data: { items: RemediationControlGap[]; total: number; note: string }
}

export function ControlGapList({ data }: ControlGapListProps) {
  const t = useT()
  return (
    <Panel title={t('x.control-gaps')} subtitle={data.note}>
      {data.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          compact
          headline="No control gap has been raised"
          description="Every signal so far was one a person could act on. When one is not — a push-bombing campaign, for instance — the engine records the missing control here instead of assigning training that cannot fix it."
        />
      ) : (
        <ul className="space-y-2">
          {data.items.map((gap) => (
            <li key={gap.id} className="rounded-panel border border-line-subtle p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-body text-fg">{gap.recommended_control}</span>
                <Badge status={gap.status} size="sm" dot />
              </div>
              <p className="mt-1 text-sm text-fg-muted">{gap.rationale}</p>
              <p className="mt-1 text-xs text-fg-faint">
                From {humanise(gap.trigger_kind)}
                {gap.trigger_ref ? ` · ${gap.trigger_ref}` : ''} · raised{' '}
                {formatDate(gap.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
