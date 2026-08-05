/**
 * The estate, counted in SQL — and the one tile that is a security metric.
 *
 * `Refused by the firewall` is not an error count. Every one of those is a plan
 * that tried to put a destination, an invented key or an unsafe "correct"
 * answer in front of an employee and was stopped. A spike in it means somebody
 * has found the product and is probing what it will write.
 *
 * `Disputes waiting` is the tile that should read zero because the queue was
 * worked, never because nobody can file one. It is shown even at zero for that
 * reason — a count that only appears when it is non-zero cannot be audited.
 */

import type { RemediationStats } from '../../domain/types'
import { Panel } from '../../components/ui'
import { cn, num } from '../../lib/format'

export interface RemediationSummaryProps {
  stats: RemediationStats
}

function Tile({
  label,
  value,
  tone,
  caption,
}: {
  label: string
  value: string
  tone?: string
  caption?: string
}) {
  return (
    <div className="min-w-0">
      <p className="label text-fg-subtle">{label}</p>
      <p className={cn('mt-1 text-title', tone ?? 'text-fg')}>{value}</p>
      {caption ? <p className="mt-0.5 text-xs text-fg-faint">{caption}</p> : null}
    </div>
  )
}

export function RemediationSummary({ stats }: RemediationSummaryProps) {
  const refusals = Object.values(stats.rejections_by_code).reduce((a, b) => a + b, 0)
  const codes = Object.entries(stats.rejections_by_code).sort((a, b) => b[1] - a[1])

  return (
    <Panel>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-7">
        <Tile label="Plans" value={num(stats.total, 0)} />
        <Tile
          label="Waiting"
          value={num(stats.by_status.proposed ?? 0, 0)}
          caption="for a human decision"
        />
        <Tile
          label="From the library"
          value={num(stats.built_from_the_library, 0)}
          caption="no model involved"
        />
        <Tile
          label="With a model"
          value={num(stats.built_with_a_model, 0)}
          tone={stats.built_with_a_model > 0 ? 'text-ai' : undefined}
        />
        <Tile
          label="Coverage gaps"
          value={num(stats.coverage_gaps, 0)}
          caption="nothing covered it"
        />
        <Tile
          label="Control gaps"
          value={num(stats.control_gaps, 0)}
          caption="a control, not a module"
        />
        <Tile
          label="Disputes waiting"
          value={num(stats.disputes_open, 0)}
          tone={stats.disputes_open > 0 ? 'text-high' : undefined}
          caption={
            stats.disputes_total > 0
              ? `${stats.disputes_total} filed in total`
              : 'nobody has contested one'
          }
        />
      </div>

      <div className="mt-5 border-t border-line-subtle pt-4">
        <p className="label text-fg-subtle">Refused by the output firewall</p>
        {refusals === 0 ? (
          <p className="mt-1 text-body text-fg-muted">
            None. Every plan built so far passed the firewall — no destination, invented key or
            unsafe answer has reached it.
          </p>
        ) : (
          <>
            <p className={cn('mt-1 text-title', 'text-critical')}>{num(refusals, 0)}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {codes.map(([code, count]) => (
                <li
                  key={code}
                  className="tech rounded-panel border border-line-subtle px-2.5 py-1 text-xs text-fg-muted"
                >
                  {code} · {count}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-2 text-xs text-fg-faint">
          A refusal is a security metric, not an error. A rise in one code means somebody is
          probing what this product will write into an employee&rsquo;s screen.
        </p>
      </div>
    </Panel>
  )
}
