/**
 * What is on this screen, counted.
 *
 * These are counts of stored records, not rates, so they carry no denominator —
 * but they do carry the caveat that matters: they describe what this deployment
 * holds, not what has been published in the world. A feed that is not running
 * produces a very calm-looking set of numbers.
 */

import { useT } from '../../lib/i18n'
import type { IntelItem } from '../../domain/types'
import { Panel } from '../../components/ui'
import { num } from '../../lib/format'

export interface IntelViewCountsProps {
  items: IntelItem[]
  /** Size of the filtered set on the server; null when it did not say. */
  total: number | null
  /** Advisories with at least one recorded match, or null when not countable. */
  matched: number | null
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-fg-subtle">{label}</span>
      <span className={tone ?? 'text-sm text-fg'}>{value}</span>
    </div>
  )
}

export function IntelViewCounts({ items, total, matched }: IntelViewCountsProps) {
  const t = useT()
  const unassessed = items.filter(
    (item) => item.relevance === 'unassessed' && !item.dismissed_by,
  ).length
  const urgent = items.filter((item) => item.relevance === 'urgent').length
  const dismissed = items.filter((item) => item.dismissed_by).length

  return (
    <Panel title={t('x.what-is-on-this-screen')} headingLevel={2}>
      <div className="space-y-1.5">
        <Row
          label={t('p.matching-these-filters')}
          value={total === null ? `${num(items.length)} shown` : num(total)}
        />
        {total !== null && total !== items.length ? (
          <Row label={t('u.shown-here')} value={num(items.length)} />
        ) : null}
        <Row
          label={t('p.with-a-match-against-us')}
          value={matched === null ? 'Not counted' : num(matched)}
          tone={matched === null ? 'text-sm text-fg-faint' : 'text-sm text-brand'}
        />
        <Row label={t('p.assessed-as-urgent')} value={num(urgent)} />
        <Row label={t('p.not-yet-assessed')} value={num(unassessed)} />
        <Row label={t('u.dismissed')} value={num(dismissed)} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fg-faint">{t('p.counts-describe-the-advisories-stored-in')}</p>
    </Panel>
  )
}
